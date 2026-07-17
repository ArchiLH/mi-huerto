import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { App as CapacitorApp } from '@capacitor/app'

interface PremiumContextType {
  isPremium: boolean
  setIsPremium: (value: boolean) => void
  refreshPremiumStatus: () => Promise<void>
  forceUpdate: number
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined)

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [isPremium, setIsPremium] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)

  // Función para refrescar premium
  const refreshPremiumStatus = async () => {
    if (!user) return

    try {
      console.log('🔄 [Context] Refrescando premium...')
      
      const { data } = await supabase
        .from('user_settings')
        .select('is_premium')
        .eq('id', user.id)
        .single()

      if (data) {
        const nuevoEstado = data.is_premium
        console.log('📊 [Context] Nuevo estado premium:', nuevoEstado)
        
        if (nuevoEstado !== isPremium) {
          console.log('🔄 [Context] CAMBIO DETECTADO!')
          setIsPremium(nuevoEstado)
          setForceUpdate(prev => prev + 1)
        }
      }
    } catch (error) {
      console.error('❌ [Context] Error:', error)
    }
  }

  // Carga inicial
  useEffect(() => {
    if (!user) return
    refreshPremiumStatus()
  }, [user])

  // Realtime
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`premium-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const nuevoEstado = (payload.new as { is_premium?: boolean })?.is_premium
          if (typeof nuevoEstado === 'boolean') {
            console.log('🔔 [Context] Realtime detectó cambio:', nuevoEstado)
            setIsPremium(nuevoEstado)
            setForceUpdate(prev => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Listener de app (retorno de Stripe)
  useEffect(() => {
    if (!user) return

    let listener: any

    const setupListener = async () => {
      listener = await CapacitorApp.addListener(
        'appStateChange',
        ({ isActive }) => {
          console.log('📱 [Context] Estado app:', isActive)
          if (isActive) {
            console.log('🔄 [Context] App activa, refrescando premium...')
            refreshPremiumStatus()
            
            setTimeout(() => {
              refreshPremiumStatus()
            }, 1000)
          }
        }
      )
    }

    setupListener()

    return () => {
      if (listener) {
        listener.remove()
      }
    }
  }, [user])

  return (
    <PremiumContext.Provider value={{ 
      isPremium, 
      setIsPremium, 
      refreshPremiumStatus,
      forceUpdate 
    }}>
      {children}
    </PremiumContext.Provider>
  )
}

export function usePremium() {
  const context = useContext(PremiumContext)
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider')
  }
  return context
}