# GymFlow Terraform Baseline

This baseline creates:
- Cloud Run service (`web-app` runtime)
- Cloud SQL PostgreSQL instance + app DB/user
- Cloud Storage buckets for photos/backups/imports
- Daily backup Cloud Scheduler job (30-day lifecycle on backup bucket)

## Apply

```bash
terraform init
terraform apply \
  -var="project_id=<gcp-project-id>" \
  -var="domain=<existing-domain>" \
  -var="web_image=<region>-docker.pkg.dev/<project>/<repo>/gymflow-web:<tag>" \
  -var="db_password=<strong-password>"
```

Domain mapping to `app.<existing-domain>` is completed in Cloud Run custom domain + DNS after deploy.
