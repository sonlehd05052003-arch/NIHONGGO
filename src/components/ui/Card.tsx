import React from 'react'
import './Card.css'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  hoverEffect?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  glass = false,
  hoverEffect = true,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`app-card ${glass ? 'card-glass' : 'card-solid'} ${
        hoverEffect ? 'card-hover' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
