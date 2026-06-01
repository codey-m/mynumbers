import { createContext, useContext, useState, useEffect, useCallback, ReactNode, AnchorHTMLAttributes } from "react"

interface RouterContextValue {
  path: string
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterContextValue>({
  path: "/",
  navigate: () => {},
})

export function Router({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const navigate = useCallback((to: string) => {
    window.history.pushState(null, "", to)
    setPath(to)
  }, [])

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useNavigate() {
  return useContext(RouterContext).navigate
}

export function usePath() {
  return useContext(RouterContext).path
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string
  children?: ReactNode
}

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const { navigate } = useContext(RouterContext)
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault()
        onClick?.(e)
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}

interface RouteProps {
  path: string
  element: ReactNode
}

export function Route(_props: RouteProps): null {
  return null
}

export function Routes({ children }: { children: ReactNode }) {
  const { path } = useContext(RouterContext)
  const routes = (Array.isArray(children) ? children : [children])
    .filter(Boolean)
    .map((child: any) => ({ path: child.props.path, element: child.props.element }))
  const match = routes.find((r: RouteProps) => r.path === path) || routes[0]
  return <>{match?.element}</>
}
