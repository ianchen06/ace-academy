import { Route, Routes } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { Home } from './pages/Home'
import { CurriculumOverview } from './pages/CurriculumOverview'
import { LevelLessons } from './pages/LevelLessons'
import { LessonDetail } from './pages/LessonDetail'
import { Drills } from './pages/Drills'
import { Quizzes } from './pages/Quizzes'
import { QuizPlay } from './pages/QuizPlay'
import { Account } from './pages/Account'
import { ResetPassword } from './pages/ResetPassword'
import { NotFound } from './pages/NotFound'

function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/curriculum" element={<CurriculumOverview />} />
          <Route path="/curriculum/:levelId" element={<LevelLessons />} />
          <Route path="/curriculum/:levelId/:lessonId" element={<LessonDetail />} />
          <Route path="/drills" element={<Drills />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/quizzes/:quizId" element={<QuizPlay />} />
          <Route path="/account" element={<Account />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <p>Ace Academy — practice with purpose. Your progress is saved on this device.</p>
      </footer>
    </div>
  )
}

export default App
