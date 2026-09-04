import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Proteção contra falhas fatais causadas por extensões do navegador ou Google Tradutor
// que manipulam nós do DOM enquanto o reconciliador do React tenta reordenar elementos
if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn("DOM Patch: insertBefore 'referenceNode' não é filho deste nó. Utilizando appendChild para evitar erro fatal.", referenceNode, this);
      return this.appendChild(newNode);
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode !== this) {
      console.warn("DOM Patch: removeChild 'child' não é filho deste nó. Ignorando remoção órfã para evitar erro fatal.", child, this);
      return child;
    }
    return originalRemoveChild.call(this, child);
  };
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

