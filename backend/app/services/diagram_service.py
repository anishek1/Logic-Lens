"""
Diagram Service - Generate Mermaid diagrams from code analysis
"""
from typing import Dict


class DiagramService:
    """Generate Mermaid diagrams for code visualization"""
    
    async def generate(self, analysis: Dict, diagram_type: str) -> str:
        """Generate a Mermaid diagram based on analysis"""
        
        generators = {
            'class': self._generate_class_diagram,
            'flowchart': self._generate_flowchart,
            'sequence': self._generate_sequence_diagram,
            'er': self._generate_er_diagram,
        }
        
        generator = generators.get(diagram_type)
        if not generator:
            raise ValueError(f"Unsupported diagram type: {diagram_type}")
        
        return generator(analysis)
    
    def _generate_class_diagram(self, analysis: Dict) -> str:
        """Generate a class diagram"""
        components = analysis.get('architecture', {}).get('components', [])
        
        if not components:
            return self._default_class_diagram()
        
        lines = ["classDiagram"]
        
        for comp in components[:10]:  # Limit to 10 components
            clean_name = self._clean_name(comp)
            lines.append(f"    class {clean_name}")
        
        # Add relationships
        for i, comp in enumerate(components[:-1]):
            if i < len(components) - 1:
                from_name = self._clean_name(comp)
                to_name = self._clean_name(components[i + 1])
                lines.append(f"    {from_name} --> {to_name}")
        
        return "\n".join(lines)
    
    def _generate_flowchart(self, analysis: Dict) -> str:
        """Generate a flowchart"""
        entry_points = analysis.get('entry_points', ['Start'])
        components = analysis.get('architecture', {}).get('components', [])
        
        lines = ["flowchart TD"]
        
        # Start node
        lines.append("    A[Start] --> B[Initialize]")
        
        # Add components as flow
        prev = "B"
        for i, comp in enumerate(components[:8]):
            node_id = chr(ord('C') + i)
            clean_name = self._clean_name(comp)
            lines.append(f"    {prev} --> {node_id}[{clean_name}]")
            prev = node_id
        
        lines.append(f"    {prev} --> Z[End]")
        
        return "\n".join(lines)
    
    def _generate_sequence_diagram(self, analysis: Dict) -> str:
        """Generate a sequence diagram"""
        components = analysis.get('architecture', {}).get('components', [])[:5]
        
        if len(components) < 2:
            components = ['Client', 'Server', 'Database']
        
        lines = ["sequenceDiagram"]
        
        # Add participants
        for comp in components:
            clean_name = self._clean_name(comp)
            lines.append(f"    participant {clean_name}")
        
        # Add interactions
        for i in range(len(components) - 1):
            from_comp = self._clean_name(components[i])
            to_comp = self._clean_name(components[i + 1])
            lines.append(f"    {from_comp}->>+{to_comp}: Request")
            lines.append(f"    {to_comp}-->>-{from_comp}: Response")
        
        return "\n".join(lines)
    
    def _generate_er_diagram(self, analysis: Dict) -> str:
        """Generate an entity-relationship diagram"""
        return """erDiagram
    User ||--o{ Project : creates
    Project ||--|{ File : contains
    File ||--o{ Analysis : generates
    Analysis ||--|{ Diagram : includes"""
    
    def _default_class_diagram(self) -> str:
        """Return a default class diagram"""
        return """classDiagram
    class Application
    class Service
    class Repository
    class Model
    Application --> Service
    Service --> Repository
    Repository --> Model"""
    
    def _clean_name(self, name: str) -> str:
        """Clean a name for use in Mermaid diagrams"""
        # Remove special characters, keep alphanumeric
        cleaned = ''.join(c for c in name if c.isalnum() or c == '_')
        return cleaned[:20] if cleaned else "Component"
