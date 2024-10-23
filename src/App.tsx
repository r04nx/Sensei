
import  DashboardComponent  from "@/components/Dashboard"
import Subscribe from "@/components/Subscribe"
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
function App() {
 
  return (
    <Router>
    <Routes>
      <Route path="/" element={<DashboardComponent />} />
      <Route path="/subscribe" element={<Subscribe />} />
    </Routes>
  </Router>
  
  )
}

export default App
