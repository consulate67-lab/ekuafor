import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { migrateStorageKeys } from './lib/storage'
import './index.css'

migrateStorageKeys()

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
