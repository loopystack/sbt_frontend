declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  
  interface AutoTableOptions {
    startY?: number;
    head?: any[][];
    body?: any[][];
    theme?: string;
    styles?: Record<string, any>;
    headStyles?: Record<string, any>;
    margin?: { left?: number; right?: number; top?: number; bottom?: number };
    columnStyles?: Record<number, Record<string, any>>;
  }
  
  function autoTable(doc: jsPDF, options: AutoTableOptions): void;
  
  export default autoTable;
}

