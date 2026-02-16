terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.40"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_project_service" "services" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "firebase.googleapis.com",
    "firebaserules.googleapis.com",
    "storage.googleapis.com",
    "cloudscheduler.googleapis.com"
  ])

  service = each.value
}

resource "google_sql_database_instance" "gymflow" {
  name             = "gymflow-pg"
  region           = var.region
  database_version = "POSTGRES_15"

  settings {
    tier = var.db_tier

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = 30
      }
    }
  }

  depends_on = [google_project_service.services]
}

resource "google_sql_database" "app" {
  name     = "gymflow"
  instance = google_sql_database_instance.gymflow.name
}

resource "google_sql_user" "app" {
  name     = "gymflow_app"
  instance = google_sql_database_instance.gymflow.name
  password = var.db_password
}

resource "google_storage_bucket" "photos" {
  name                        = "${var.project_id}-gymflow-photos"
  location                    = "EU"
  uniform_bucket_level_access = true
  force_destroy               = false
}

resource "google_storage_bucket" "backups" {
  name                        = "${var.project_id}-gymflow-backups"
  location                    = "EU"
  uniform_bucket_level_access = true
  force_destroy               = false

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket" "imports" {
  name                        = "${var.project_id}-gymflow-imports"
  location                    = "EU"
  uniform_bucket_level_access = true
  force_destroy               = false
}

resource "google_service_account" "web" {
  account_id   = "gymflow-web-sa"
  display_name = "GymFlow Web App"
}

# Secret Manager secrets
# Populate via: echo -n "your-secret-value" | gcloud secrets versions add SECRET_NAME --data-file=-

resource "google_secret_manager_secret" "database_url" {
  secret_id = "gymflow-database-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret = google_secret_manager_secret.database_url.id
  # This will be auto-populated by Terraform with the constructed DATABASE_URL
  secret_data = "postgresql://${google_sql_user.app.name}:${var.db_password}@/${google_sql_database.app.name}?host=/cloudsql/${google_sql_database_instance.gymflow.connection_name}"
}

resource "google_secret_manager_secret" "firebase_service_account" {
  secret_id = "gymflow-firebase-service-account"

  replication {
    auto {}
  }

  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "firebase_service_account" {
  secret = google_secret_manager_secret.firebase_service_account.id
  # Populate via: cat service-account.json | gcloud secrets versions add gymflow-firebase-service-account --data-file=-
  secret_data = "{}"
}

resource "google_secret_manager_secret" "firebase_api_key" {
  secret_id = "gymflow-firebase-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "firebase_api_key" {
  secret = google_secret_manager_secret.firebase_api_key.id
  # Populate via: echo -n "your-firebase-api-key" | gcloud secrets versions add gymflow-firebase-api-key --data-file=-
  secret_data = "PLACEHOLDER"
}

# IAM roles for service account

resource "google_project_iam_member" "web_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.web.email}"
}

resource "google_project_iam_member" "web_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.web.email}"
}

resource "google_project_iam_member" "web_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.web.email}"
}

resource "google_cloud_run_v2_service" "web" {
  name     = var.service_name
  location = var.region

  template {
    service_account = google_service_account.web.email

    # Cloud SQL connection annotation
    metadata {
      annotations = {
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.gymflow.connection_name
      }
    }

    containers {
      image = var.web_image

      # Secret environment variables from Secret Manager
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "FIREBASE_SERVICE_ACCOUNT_JSON"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.firebase_service_account.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "FIREBASE_WEB_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.firebase_api_key.secret_id
            version = "latest"
          }
        }
      }

      # Non-secret environment variables
      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "APP_BASE_URL"
        value = google_cloud_run_v2_service.web.uri
      }

      env {
        name  = "DATABASE_SSL"
        value = "true"
      }

      env {
        name  = "GCS_BACKUPS_BUCKET"
        value = google_storage_bucket.backups.name
      }

      env {
        name  = "GCS_IMPORTS_BUCKET"
        value = google_storage_bucket.imports.name
      }

      env {
        name  = "GCS_PHOTOS_BUCKET"
        value = google_storage_bucket.photos.name
      }

      # Startup probe
      startup_probe {
        http_get {
          path = "/api/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      # Liveness probe
      liveness_probe {
        http_get {
          path = "/api/health"
        }
        period_seconds = 30
      }
    }
  }

  ingress = "INGRESS_TRAFFIC_ALL"

  depends_on = [google_project_service.services]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  location = google_cloud_run_v2_service.web.location
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_scheduler_job" "daily_backup" {
  name        = "gymflow-daily-backup"
  region      = var.region
  schedule    = "0 2 * * *"
  time_zone   = "Europe/Berlin"
  description = "Daily backup trigger"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.web.uri}/api/backup/export"

    headers = {
      "Content-Type" = "application/json"
    }

    body = base64encode("{}")

    oidc_token {
      service_account_email = google_service_account.web.email
    }
  }
}

output "web_url" {
  value = google_cloud_run_v2_service.web.uri
}

output "app_domain_placeholder" {
  value = "app.${var.domain}"
}
