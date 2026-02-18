import React from 'react'
import { Card, CardContent, CardFooter, CardHeader } from './ui/card'
import gymflowLogo from '../assets/gymflow-logo.png'

interface AuthLayoutProps {
  title?: string
  children: React.ReactNode
}

export default function AuthLayout({ title, children }: AuthLayoutProps): JSX.Element {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -end-32 h-72 w-72 rounded-full bg-primary opacity-10 blur-3xl" />
        <div className="absolute bottom-0 -start-20 h-64 w-64 rounded-full bg-primary opacity-10 blur-3xl" />
      </div>
      <div className="relative flex items-center justify-center p-6 min-h-screen">
        <Card className="w-full max-w-md shadow-md border-border/60 animate-slide-up">
          <CardHeader className="text-center space-y-3">
            <div className="flex items-center justify-center">
              <img src={gymflowLogo} alt="GymFlow" className="h-20 w-auto" />
            </div>
            {title && (
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-2">{children}</CardContent>
          <CardFooter className="flex justify-center border-t border-border">
            <p className="text-xs text-muted-foreground">
              GymFlow v1.0.0 • Secure Membership Management
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
