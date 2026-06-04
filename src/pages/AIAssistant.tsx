import { useState } from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Sparkles, Brain, BookOpen, ListChecks, Layers, Link2, History } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReflectionAnalyzer from '@/components/assistant/ReflectionAnalyzer';
import ConceptExplainer from '@/components/assistant/ConceptExplainer';
import QuizGenerator from '@/components/assistant/QuizGenerator';
import FlashcardGenerator from '@/components/assistant/FlashcardGenerator';
import ResourceRecommender from '@/components/assistant/ResourceRecommender';
import AIHistory from '@/components/assistant/AIHistory';

export default function AIAssistant() {
  const [tab, setTab] = useState('reflection');

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-primary">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">AI Study Assistant</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Your personalized coach — connected to your sessions, reflections, and goals.
              </p>
            </div>
          </div>
        </motion.div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted/30 p-1 md:grid-cols-6">
            <TabsTrigger value="reflection" className="gap-1.5 text-xs md:text-sm">
              <Brain className="h-3.5 w-3.5" /> Reflection
            </TabsTrigger>
            <TabsTrigger value="explain" className="gap-1.5 text-xs md:text-sm">
              <BookOpen className="h-3.5 w-3.5" /> Explain
            </TabsTrigger>
            <TabsTrigger value="quiz" className="gap-1.5 text-xs md:text-sm">
              <ListChecks className="h-3.5 w-3.5" /> Quiz
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="gap-1.5 text-xs md:text-sm">
              <Layers className="h-3.5 w-3.5" /> Flashcards
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-1.5 text-xs md:text-sm">
              <Link2 className="h-3.5 w-3.5" /> Resources
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs md:text-sm">
              <History className="h-3.5 w-3.5" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reflection"><ReflectionAnalyzer /></TabsContent>
          <TabsContent value="explain"><ConceptExplainer /></TabsContent>
          <TabsContent value="quiz"><QuizGenerator /></TabsContent>
          <TabsContent value="flashcards"><FlashcardGenerator /></TabsContent>
          <TabsContent value="resources"><ResourceRecommender /></TabsContent>
          <TabsContent value="history"><AIHistory /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
