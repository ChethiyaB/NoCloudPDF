import { Combine, ListOrdered, Trash2, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ToolboxViewProps {
  onSelectAction: (action: 'merge' | 'reorder' | 'delete' | 'edit') => void;
}

export function ToolboxView({ onSelectAction }: ToolboxViewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-6xl mx-auto"
    >
      <h1 className="text-3xl font-bold text-on-surface mb-2 hidden md:block">Toolbox</h1>
      <h1 className="text-2xl font-bold text-on-surface mb-2 md:hidden">Toolbox</h1>
      <p className="text-secondary text-lg mb-8">Select a tool to start manipulating your PDF documents.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Merge PDFs */}
        <div 
          onClick={() => onSelectAction('merge')}
          className="group relative bg-surface-container-lowest border border-surface-variant rounded-xl p-6 flex flex-col items-start hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-container-low opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary mb-4 z-10">
            <Combine size={24} />
          </div>
          <h3 className="text-xl font-semibold text-on-surface mb-2 z-10">Merge PDFs</h3>
          <p className="text-secondary text-sm mb-6 z-10">Combine multiple PDF files into one document in seconds.</p>
        </div>

        {/* Card 2: Reorder Pages */}
        <div 
          onClick={() => onSelectAction('reorder')}
          className="group relative bg-surface-container-lowest border border-surface-variant rounded-xl p-6 flex flex-col items-start hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-container-low opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary mb-4 z-10">
            <ListOrdered size={24} />
          </div>
          <h3 className="text-xl font-semibold text-on-surface mb-2 z-10">Reorder Pages</h3>
          <p className="text-secondary text-sm mb-6 z-10">Drag and drop to rearrange pages within your PDF exactly how you need them.</p>
        </div>

        {/* Card 3: Delete Pages */}
        <div 
          onClick={() => onSelectAction('delete')}
          className="group relative bg-surface-container-lowest border border-surface-variant rounded-xl p-6 flex flex-col items-start hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-container-low opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary mb-4 z-10">
            <Trash2 size={24} />
          </div>
          <h3 className="text-xl font-semibold text-on-surface mb-2 z-10">Delete Pages</h3>
          <p className="text-secondary text-sm mb-6 z-10">Remove unwanted pages from your document to keep it concise and relevant.</p>
        </div>

        {/* Card 4: Edit PDF */}
        <div 
          onClick={() => onSelectAction('edit')}
          className="group relative bg-surface-container-lowest border border-surface-variant rounded-xl p-6 flex flex-col items-start hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-container-low opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary mb-4 z-10">
            <Edit3 size={24} />
          </div>
          <h3 className="text-xl font-semibold text-on-surface mb-2 z-10">Edit PDF</h3>
          <p className="text-secondary text-sm mb-6 z-10">Add text, shapes, or annotations directly to your PDF documents.</p>
        </div>

      </div>
    </motion.div>
  );
}
