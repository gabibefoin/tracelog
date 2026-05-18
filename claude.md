# Tracelog

App de notas para estudos de cybersecurity.

## Design System — fonte da verdade

O design system completo está em:
/Users/gabilemos/Documents/claude/design_handoff_tracelog_app

Lê essa pasta ANTES de qualquer tarefa que envolva:
- Cores, tipografia, espaçamento
- Novos componentes
- Correções visuais
- Dark/light mode

## Regras invioláveis de cor

NUNCA hardcodar cores fora de tailwind.config.ts e globals.css.
NUNCA usar azul — não existe azul na paleta do Tracelog.
NUNCA usar classes Tailwind genéricas de cor (bg-gray-*, 
text-gray-*, border-gray-*, ring-blue-*, etc).
SEMPRE usar tokens do design system via CSS variable ou 
classe Tailwind customizada.

## Paleta resumida

Brand: #DB4842 (red/primary)

Light ("paper"):
- canvas: #F4F1E8
- surface: #FBF8EF
- raised: #FFFCF4
- rule: #E3DECF
- ink: #1A1814
- ink/dim: #5C564B
- ink/faint: #888678

Dark ("coffee"):
- canvas: #1F101A
- surface: #26241F
- raised: #2E2B25
- rule: #3A3631
- ink: #ECE7D9
- ink/dim: #A29B8C
- ink/faint: #6E6A60

## Antes de criar qualquer componente novo
1. Consultar o design system na pasta acima
2. Usar apenas tokens definidos lá
3. Garantir que funciona em light e dark mode
4. Sem azul. Sem cinza genérico. Sem hardcode.