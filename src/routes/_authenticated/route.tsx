// Pathless layout route that gates every child under `src/routes/_authenticated/`
// behind a signed-in user, then loads that user's saved data before any page renders.
// Client-rendered (`ssr: false`) because the session lives in `localStorage`.
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'
import { hydrateFor, update } from '@/lib/store'
import { PENDING_SETUP_KEY } from '@/lib/phone-auth'

const SIGN_IN_ROUTE = '/auth'

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      throw redirect({ to: SIGN_IN_ROUTE })
    }
    await hydrateFor(data.user.id)
    const pending = sessionStorage.getItem(PENDING_SETUP_KEY)
    if (pending) {
      sessionStorage.removeItem(PENDING_SETUP_KEY)
      try {
        const { wake, sleep } = JSON.parse(pending) as { wake?: string; sleep?: string }
        update((st) => ({ ...st, settings: { ...st.settings, wake: wake || st.settings.wake, sleep: sleep || st.settings.sleep } }))
      } catch { /* ignore a malformed note */ }
    }
    return { user: data.user }
  },
  component: () => <Outlet />,
})
