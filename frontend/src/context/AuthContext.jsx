import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { session } from "../services/api";
import { authService } from "../services/authService";
export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null),
    [message, setMessage] = useState(""),
    [cargando, setCargando] = useState(true),
    [cerrando, setCerrando] = useState(false);
  const timer = useRef(),
    version = useRef(0);
  const clearSession = useCallback((reason = "") => {
    version.current++;
    clearTimeout(timer.current);
    session.clear();
    setUsuario(null);
    setCargando(false);
    setMessage(reason);
  }, []);
  const accept = useCallback(
    (user, expiresAt) => {
      clearTimeout(timer.current);
      setUsuario(user);
      setMessage("");
      timer.current = setTimeout(
        () => clearSession("Tu sesión venció. Inicia sesión de nuevo."),
        Math.max(0, Date.parse(expiresAt) - Date.now()),
      );
    },
    [clearSession],
  );
  const restaurar = useCallback(async () => {
    const attempt = ++version.current;
    setCargando(true);
    try {
      const { expiresAt, ...user } = await authService.me(true);
      if (attempt === version.current) accept(user, expiresAt);
    } catch (e) {
      if (attempt !== version.current) return;
      setUsuario(null);
      setMessage(
        e.status === 401
          ? ""
          : "No se pudo recuperar la sesión. Comprueba la conexión y reintenta.",
      );
    } finally {
      if (attempt === version.current) setCargando(false);
    }
  }, [accept]);
  useEffect(() => {
    session.onUnauthorized(() =>
      clearSession(
        "Tu sesión venció o dejó de ser válida. Inicia sesión de nuevo.",
      ),
    );
    restaurar();
    return () => {
      version.current++;
      session.onUnauthorized(() => {});
      clearTimeout(timer.current);
    };
  }, [clearSession, restaurar]);
  async function login(body) {
    const result = await authService.login(body);
    version.current++;
    session.setCsrf(result.csrfToken);
    accept(result.usuario, result.expiresAt);
    setCargando(false);
    return result.usuario;
  }
  async function logout() {
    setCerrando(true);
    try {
      await authService.logout();
      clearSession();
      return true;
    } catch (e) {
      if (e.status === 401) {
        clearSession();
        return true;
      }
      setMessage(
        "No se pudo cerrar la sesión en el servidor. Comprueba la conexión y vuelve a intentarlo.",
      );
      return false;
    } finally {
      setCerrando(false);
    }
  }
  async function refresh() {
    const { expiresAt, ...user } = await authService.me();
    accept(user, expiresAt);
    return user;
  }
  return (
    <AuthContext.Provider
      value={{
        usuario,
        isAdmin: usuario?.rol?.codigo === "administrador",
        login,
        logout,
        message,
        refresh,
        cargando,
        cerrando,
        restaurar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
