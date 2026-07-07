'use client'

import React from 'react'

interface LoaderProps {
  type?: 'card-skeleton' | 'detail-skeleton' | 'spinner' | 'dots'
  count?: number
}

export default function Loader({ type = 'spinner', count = 3 }: LoaderProps) {
  if (type === 'card-skeleton') {
    return (
      <div className="loader-container card-skeleton-list">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="beautiful-card-skeleton">
            <div className="skeleton-header">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-badge" />
            </div>
            <div className="skeleton-body">
              <div className="skeleton-line skeleton-text-1" />
              <div className="skeleton-line skeleton-text-2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'detail-skeleton') {
    return (
      <div className="loader-container detail-skeleton">
        <div className="skeleton-line skeleton-breadcrumb" />
        <div className="skeleton-header-detail">
          <div className="skeleton-line skeleton-title-large" />
          <div className="skeleton-badge-large" />
        </div>
        <div className="skeleton-section-label" />
        <div className="skeleton-chips-row">
          <div className="skeleton-chip" />
          <div className="skeleton-chip" />
          <div className="skeleton-chip" />
        </div>
        <div className="skeleton-card-list">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="beautiful-card-skeleton detail-card-skeleton">
              <div className="skeleton-line skeleton-text-1" style={{ width: '40%' }} />
              <div className="skeleton-line skeleton-text-2" style={{ width: '20%', height: '0.65rem' }} />
              <div className="skeleton-line skeleton-text-3" style={{ width: '85%' }} />
              <div className="skeleton-line skeleton-text-4" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'dots') {
    return (
      <div className="loader-container flex-center">
        <div className="beautiful-dots-loader">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
      </div>
    )
  }

  // Default: spinner
  return (
    <div className="loader-container flex-center py-8">
      <div className="beautiful-spinner-wrapper">
        <div className="beautiful-spinner-ring" />
        <div className="beautiful-spinner-core" />
      </div>
    </div>
  )
}
