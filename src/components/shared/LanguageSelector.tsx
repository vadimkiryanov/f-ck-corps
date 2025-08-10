import React from "react"

interface LanguageSelectorProps {
  currentLanguage: string
  setLanguage: (language: string) => void
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  setLanguage
}) => {
  const handleLanguageChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newLanguage = e.target.value
    
    try {
      // Save language preference to electron store
      await window.electronAPI.updateConfig({ language: newLanguage })
      
      // Update global language variable
      window.__LANGUAGE__ = newLanguage
      
      // Update state in React
      setLanguage(newLanguage)
      
      console.log(`Language changed to ${newLanguage}`);
    } catch (error) {
      console.error("Error updating language:", error)
    }
  }

  return (
    <div className="px-2 mb-3 space-y-1">
      <div className="flex items-center justify-between text-[13px] font-medium text-white/90">
        <span>Language</span>
        <select
          value={currentLanguage}
          onChange={handleLanguageChange}
          className="px-2 py-1 text-sm border rounded outline-none bg-black/80 text-white/90 border-white/10 focus:border-white/20"
          style={{ WebkitAppearance: 'menulist' }}
        >
          <option value="javascript" className="text-white bg-black">JavaScript</option>
          <option value="typescript" className="text-white bg-black">TypeScript</option>
          <option value="reactjs" className="text-white bg-black">React.JS</option>
          <option value="CSS" className="text-white bg-black">CSS</option>
          <option value="sql" className="text-white bg-black">SQL</option>
        </select>
      </div>
    </div>
  )
}
