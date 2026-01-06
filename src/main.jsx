import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import NutritionDecoderApp from './NutritionDecoderApp.tsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NutritionDecoderApp />
  </StrictMode>,
)
