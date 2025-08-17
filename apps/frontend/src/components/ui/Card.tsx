import React from 'react'

interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className = '', children }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children }: CardProps) {
  return (
    <div className={`card-header ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ className = '', children }: CardProps) {
  return (
    <h3 className={`card-title ${className}`}>
      {children}
    </h3>
  )
}

export function CardDescription({ className = '', children }: CardProps) {
  return (
    <p className={`card-description ${className}`}>
      {children}
    </p>
  )
}

export function CardContent({ className = '', children }: CardProps) {
  return (
    <div className={`${className}`}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children }: CardProps) {
  return (
    <div className={`flex items-center pt-4 ${className}`}>
      {children}
    </div>
  )
}
