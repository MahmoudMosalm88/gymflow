import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Button, buttonVariants } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'

interface Member {
  id: string
  name: string
  phone: string
  gender: 'male' | 'female'
  photo_path: string | null
  access_tier: 'A' | 'B'
  created_at: number
}

const toSafeFileUrl = (pathOrUrl: string): string => {
  if (!pathOrUrl) return ''
  if (
    pathOrUrl.startsWith('data:') ||
    pathOrUrl.startsWith('http://') ||
    pathOrUrl.startsWith('https://') ||
    pathOrUrl.startsWith('file://')
  ) {
    return pathOrUrl
  }

  const normalized = pathOrUrl.replace(/\\/g, '/')
  if (normalized.startsWith('//')) {
    return encodeURI(`file:${normalized}`)
  }
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return encodeURI(`file:///${normalized}`)
  }
  if (normalized.startsWith('/')) {
    return encodeURI(`file://${normalized}`)
  }
  return encodeURI(`file:///${normalized}`)
}

export default function Members(): JSX.Element {
  const { t } = useTranslation()
  const [members, setMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      const data = await window.api.members.getAll()
      setMembers(data)
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      try {
        const results = await window.api.members.search(query)
        setMembers(results)
      } catch (error) {
        console.error('Search failed:', error)
      }
    } else {
      loadMembers()
    }
  }

  const filteredMembers = members

  return (
    <div className="min-h-full p-4 md:p-8 bg-muted/30">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">
            {t('members.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('members.subtitle') || `Manage ${filteredMembers.length} members`}
          </p>
        </div>
        <Link to="/members/new" className={buttonVariants({ className: 'gap-2' })}>
          <PlusIcon className="w-5 h-5" />
          {t('members.addMember')}
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('members.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-12 w-full"
        />
      </div>

      {/* Members Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-muted-foreground text-lg">{t('members.noMembers')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('members.name')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('members.phone')}
                  </th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('members.gender')}
                  </th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('members.tier')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('members.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-muted/60 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center overflow-hidden flex-shrink-0">
                          {member.photo_path ? (
                            <img
                              src={
                                member.photo_path.startsWith('data:')
                                  ? member.photo_path
                                  : toSafeFileUrl(member.photo_path)
                              }
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-sm font-bold">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-heading font-semibold text-foreground">
                            {member.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {member.phone}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {t(`members.${member.gender}`)}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <span className={`badge text-xs ${member.access_tier === 'A' ? 'badge-success' : 'badge-warning'}`}>
                        {t(`members.tier${member.access_tier}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        to={`/members/${member.id}`}
                        className={buttonVariants({ variant: 'link', className: 'px-0' })}
                      >
                        {t('common.view')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  )
}
