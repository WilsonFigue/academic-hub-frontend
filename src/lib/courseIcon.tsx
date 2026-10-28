import {
  Atom, BookOpen, Calculator, ChartNoAxesCombined, Code2, Database, Dna, FlaskConical, Globe2, Landmark, Languages,
  Network, PenTool, Scale, Sigma, Users, Wrench, Cpu, type LucideIcon,
} from 'lucide-react';

/* Icono por materia, deducido del nombre (sin inventar datos: solo una ilustración del tema). */
const RULES: Array<[RegExp, LucideIcon]> = [
  [/base.?de.?datos|sql|datos/i, Database],
  [/c[áa]lculo|matem|[áa]lgebra|ecuaciones|estad[íi]stica/i, Sigma],
  [/program|software|algoritm|c[óo]digo|web|desarrollo/i, Code2],
  [/f[íi]sica|mec[áa]nica|cu[áa]ntica/i, Atom],
  [/qu[íi]mica|laboratorio/i, FlaskConical],
  [/biolog|gen[ée]tica|anatom/i, Dna],
  [/[ée]tica|derecho|legal|jur[íi]d|sociedad|filosof/i, Scale],
  [/ingl[ée]s|idioma|lengua|franc[ée]s/i, Languages],
  [/red|comunicaci|telem/i, Network],
  [/electr[óo]nic|circuit|digital|arquitectura de comput/i, Cpu],
  [/dise[ñn]o|gr[áa]fic|arte/i, PenTool],
  [/historia|econom|pol[íi]tica|finanz|contab/i, Landmark],
  [/administra|gesti[óo]n|mercad|negoci/i, ChartNoAxesCombined],
  [/geograf|ambient|ecolog/i, Globe2],
  [/psicolog|sociolog|humanid|comunicaci[óo]n/i, Users],
  [/mec[áa]nica|industrial|materiales|taller/i, Wrench],
  [/contab|costos|auditor/i, Calculator],
];

export function courseIcon(name: string): LucideIcon {
  for (const [pattern, icon] of RULES) if (pattern.test(name)) return icon;
  return BookOpen;
}
