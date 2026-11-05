# Aplicación de JWT en SUGAR MOOD · Día 2

Investigación previa a la implementación, 5 de noviembre de 2026.

## Token y verificación

Un JWT firmado tiene tres partes: header (algoritmo y tipo), payload (claims) y firma. La codificación del payload no oculta su contenido. No se incluyen contraseñas, hashes ni datos de contacto. El servidor firma con una clave secreta de configuración; el cliente presenta el resultado en Authorization: Bearer. Decodificar no demuestra autenticidad: se debe verificar firma, algoritmo admitido y expiración.

Decisión: jsonwebtoken en Express, HS256 explícito, secreto aleatorio de al menos 32 bytes guardado en backend/.env, emisor sugar-mood y audiencia sugar-mood-web. Payload mínimo: sub (ID de usuario), iat y exp. Duración: una hora. El middleware vuelve a consultar usuario y rol en MySQL: borrar una cuenta o cambiar su rol tiene efecto en la siguiente petición, sin confiar en permisos antiguos del token.

## Almacenamiento, XSS y CSRF

localStorage conserva datos entre reinicios y sessionStorage durante la pestaña, pero ambos son accesibles por JavaScript: una inyección XSS puede extraerlos. Una cookie httpOnly evita su lectura directa desde JavaScript, pero se envía automáticamente y exige estudiar CSRF, SameSite y protección de las mutaciones. Un XSS todavía puede realizar operaciones desde una sesión abierta.

Decisión actualizada por solicitud del usuario: JWT en cookie httpOnly, SameSite=Lax, sin Domain, Path=/ y Max-Age de una hora. En producción se usa Secure y un prefijo __Host- para impedir cookies de sesión con Domain. Se sustituyó la decisión inicial de memoria para conservar la sesión al recargar. El navegador usa credentials: include y X-Session-Mode: cookie; el JWT no se devuelve en el JSON de este modo ni se lee desde JavaScript. AuthContext recupera usuario y expiración desde /auth/me antes de resolver las rutas protegidas. Bearer continúa disponible para Postman, conservando esa modalidad del PDF.

Como las cookies se envían automáticamente, se añadió protección CSRF. /auth/csrf entrega una prueba nonce.firma en JSON y en una cookie httpOnly. La firma HMAC se vincula al JWT de sesión; toda mutación en modo cookie debe enviarla como X-CSRF-Token y coincidir con la cookie. No se confía solamente en SameSite. Se rechazan orígenes no autorizados y solicitudes cross-site no aprobadas; CORS permite credenciales únicamente a orígenes admitidos. Login también exige prueba CSRF en modo navegador. Las cookies se reutilizan entre recargas cuando la prueba sigue siendo válida; una prueba antigua se puede renovar y reintentar una sola vez. Un XSS todavía podría operar desde la página: httpOnly evita leer el JWT, no elimina todos los efectos de una inyección.

## Expiración, renovación y logout

Un access token vencido produce 401. Frontend borra la sesión, informa al usuario y vuelve al login; también programa el vencimiento local y no depende solo de ocultar páginas. Un 403 indica falta de permiso y no cierra una sesión válida.

Un refresh token permite obtener otro access token sin pedir credenciales; requiere almacenamiento, expiración, rotación y revocación seguros. El PDF exige investigarlo, no implementarlo. Esta entrega requiere volver a iniciar sesión al vencer. Recargar conserva la cookie pero no prolonga exp. Logout llama al servidor para borrar la cookie de sesión y la prueba CSRF; una copia externa del JWT sigue siendo válida hasta exp, salvo que la cuenta se borre, se desactive o cambie su contraseña. El claim ver se compara con usuarios.sesionVersion en cada petición. No se afirma tener una lista de revocación. Si la petición de logout falla por conexión, se informa y no se afirma que se eliminó la cookie.

## Contraseñas y roles

Se usa bcrypt con coste 12, contraseña de al menos ocho caracteres y límite de 72 bytes UTF-8 para evitar truncamiento. Se conserva el hash, nunca la contraseña original. Registro y login solo responden datos públicos del usuario. El secreto JWT es independiente de las contraseñas y no tiene un valor predeterminado en el código.

La autenticación no sustituye la autorización. Los roles Administrador y Cliente se almacenan en roles; usuarios.id_rol es FK. El registro público asigna Cliente y rechaza id_rol. El rol se comprueba en backend. Los pedidos y sus detalles se filtran por el perfil de cliente vinculado a la cuenta. Para registros ajenos se responde 404, evitando confirmar su existencia. Los roles adicionales no reciben permisos automáticamente.

En una publicación real se requiere HTTPS para impedir que Bearer o contraseñas viajen en claro. HTTP se limita al entorno local. El middleware valida el token antes de ejecutar los CRUDs; la clave y credenciales no se registran ni se incluyen en Git.

## Fuentes consultadas

- [Documentación oficial de jsonwebtoken](https://github.com/auth0/node-jsonwebtoken): sign, verify, expiresIn, algoritmo, issuer y audience.
- [OWASP: HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html): almacenamiento accesible a JavaScript y riesgo XSS.
- [OWASP: Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): hash de contraseñas, coste de bcrypt y límite de entrada.
- [OWASP: JSON Web Token](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html): consideraciones de transporte y contenido del token.
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie): httpOnly, Secure, SameSite, Max-Age y envío con credenciales.
- [OWASP: CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): prueba firmada vinculada a la sesión y comprobación de origen.

El requisito de roles amplía por solicitud del usuario el PDF del día 2, que solo exige usuarios autenticados. Se mantienen las reglas originales de transacciones, importes e historial.
