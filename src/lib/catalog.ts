import type { LinkProps } from '@tanstack/react-router'

export interface NavLink {
  id: string
  title: string
  description: string
  emoji: string
  to: LinkProps['to']
  gradient: string
}

export const navLinks: Array<NavLink> = []
