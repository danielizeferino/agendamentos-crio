// pages/_app.js
import "../styles/globals.css"; // mantém o seu CSS global

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
