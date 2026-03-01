import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signOut: () => Promise<void>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isPasswordRecovery: false,
  signOut: async () => { },
  clearPasswordRecovery: () => { },
});

/**
 * Provides access to the current authentication context.
 * 
 * @hook
 * @returns {AuthContextType} The active user session, state flags, and auth actions.
 */
export const useAuth = () => useContext(AuthContext);

/**
 * AuthProvider Component
 * 
 * Central context provider that initializes and bridges the local application
 * state with the Supabase Authentication service. It listens to global auth
 * events (login, logout, password recovery flows) and broadcasts the active
 * user object globally for protected routing and database-level user queries.
 * 
 * @component
 * @param {Object} props - The component children.
 * @param {ReactNode} props.children - Applications components requiring auth scope.
 * @returns {JSX.Element} The authentication context provider wrapper.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Logs out the currently authenticated user by calling the Supabase auth API
   * and subsequently causes all downstream components to rerender without a user block.
   * 
   * @async
   * @function signOut
   * @returns {Promise<void>}
   */
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const clearPasswordRecovery = () => setIsPasswordRecovery(false);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isPasswordRecovery, signOut, clearPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}
