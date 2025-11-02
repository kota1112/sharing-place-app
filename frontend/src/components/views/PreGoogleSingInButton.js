// import { useEffect, useRef } from "react";
// import { setToken } from "../lib/api";
// import { googleLogin } from "../lib/api";

// export default function GoogleSignInButton({ onSuccess }) {
//   const btnRef = useRef(null);
//   const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

//   useEffect(() => {
//     if (!window.google || !clientId || !btnRef.current) return;

//     window.google.accounts.id.initialize({
//       client_id: clientId,
//       callback: async (resp) => {
//         try {
//           const { data, auth } = await googleLogin(resp.credential);
//           if (auth) setToken(auth.replace("Bearer ", ""));
//           onSuccess?.(data?.user);
//         } catch (e) {
//           alert("Googleログインに失敗しました: " + (e.message || e));
//         }
//       },
//       ux_mode: "popup" // or 'redirect'
//     });
//     window.google.accounts.id.renderButton(btnRef.current, {
//       theme: "outline",
//       size: "large",
//       text: "continue_with",
//       shape: "pill",
//       logo_alignment: "left",
//       width: 280
//     });
//   }, [clientId]);

//   return <div ref={btnRef} />;
// }
