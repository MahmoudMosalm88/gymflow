'use client'

import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Stats from './components/Stats'
import Features from './components/Features'
import Testimonials from './components/Testimonials'
import CaseStudy from './components/CaseStudy'
import HowItWorks from './components/HowItWorks'
import FAQ from './components/FAQ'
import CTA from './components/CTA'
import Footer from './components/Footer'

const APP_VERSION = '1.0.8'
const RELEASES_LATEST_URL = 'https://github.com/MahmoudMosalm88/gymflow/releases/latest'
const FALLBACK_WIN_URL = `https://github.com/MahmoudMosalm88/gymflow/releases/download/v${APP_VERSION}/gymflow-${APP_VERSION}-setup.exe`

const LANDING_STATS = {
  activeMembers: '1,284',
  activeMembersGrowth: '12',
  checkinsToday: '342',
  checkinsTime: '6:30 PM',
  activeGyms: '5K+',
  membersTracked: '2.5M+',
  checkinsPerMonth: '50M+',
  userRating: '⭐ 4.9'
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [preferredOS, setPreferredOS] = useState('win')
  const [downloads, setDownloads] = useState({
    mac: RELEASES_LATEST_URL,
    win: FALLBACK_WIN_URL
  })

  useEffect(() => {
    setMounted(true)

    const uaDataPlatform = navigator.userAgentData?.platform || ''
    const platform = navigator.platform || ''
    const ua = navigator.userAgent || ''
    const appVersion = navigator.appVersion || ''
    const fingerprint = `${uaDataPlatform} ${platform} ${ua} ${appVersion}`.toLowerCase()
    if (/(mac|macintosh|mac os x)/.test(fingerprint)) {
      setPreferredOS('mac')
    } else {
      setPreferredOS('win')
    }

    let cancelled = false
    const hydrateDownloads = async () => {
      try {
        const response = await fetch(
          'https://api.github.com/repos/MahmoudMosalm88/gymflow/releases/latest'
        )
        if (!response.ok) return
        const data = await response.json()
        const assets = Array.isArray(data?.assets) ? data.assets : []
        const macAsset =
          assets.find((asset) => /(?:mac|arm64).*\.dmg$/i.test(asset?.name || '')) ||
          assets.find((asset) => /\.dmg$/i.test(asset?.name || ''))
        const winAsset =
          assets.find((asset) => /(?:win|setup).*\.exe$/i.test(asset?.name || '')) ||
          assets.find((asset) => /\.exe$/i.test(asset?.name || ''))

        if (!cancelled) {
          setDownloads({
            mac: macAsset?.browser_download_url || RELEASES_LATEST_URL,
            win: winAsset?.browser_download_url || FALLBACK_WIN_URL
          })
        }
      } catch {
        // Keep fallback URLs if the API call fails
      }
    }

    hydrateDownloads()

    return () => {
      cancelled = true
    }
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />
      <Hero downloads={downloads} preferredOS={preferredOS} />
      <Stats />
      <Features />
      <Testimonials />
      <CaseStudy />
      <HowItWorks />
      <FAQ />
      <CTA downloads={downloads} />
      <Footer />
    </div>
  )
}
