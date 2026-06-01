import { createGlobalStyle } from "styled-components"

export const GlobalStyles = createGlobalStyle`
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    background: #e8e8e8;
    margin: 0;
    padding: 10px;
  }

  @media (max-width: 600px) {
    body {
      padding: 6px;
    }
  }

  @keyframes lb-write-in-eq {
    0%   { clip-path: inset(0 100% 0 0); }
    100% { clip-path: inset(0 -40px 0 0); }
  }

  @keyframes lb-write-in {
    0%   { clip-path: inset(0 100% 0 0); }
    100% { clip-path: inset(0 0% 0 0); }
  }
`
