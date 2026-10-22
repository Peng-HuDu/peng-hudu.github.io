const journals={
 'Journal of the American Chemical Society':'J. Am. Chem. Soc.',
 'Chemistry of Materials':'Chem. Mater.','ACS Nano':'ACS Nano',
 'Angewandte Chemie International Edition':'Angew. Chem. Int. Ed.',
 'Advanced Theory and Simulations':'Adv. Theory Simul.',
 'ACS Materials Letters':'ACS Mater. Lett.',
 'The Journal of Physical Chemistry C':'J. Phys. Chem. C',
 'Journal of Materials Chemistry C':'J. Mater. Chem. C',
 'Journal of Materials Chemistry A':'J. Mater. Chem. A',
 'Physical Review B':'Phys. Rev. B',
 'Journal of Energy Storage':'J. Energy Storage',
 'ACS Applied Materials & Interfaces':'ACS Appl. Mater. Interfaces',
 'Nano Letters':'Nano Lett.','Materials Today Physics':'Mater. Today Phys.',
 'ACS Applied Energy Materials':'ACS Appl. Energy Mater.',
 'Physical Review Materials':'Phys. Rev. Mater.',
 'Physical Review Applied':'Phys. Rev. Appl.',
 'Physica B: Condensed Matter':'Physica B Condens. Matter'
};
export const journalAbbreviation=value=>journals[String(value).trim()]||String(value||'').trim();
export function plainTitle(value=''){
 const digits='₀₁₂₃₄₅₆₇₈₉';
 return String(value).replace(/<sub>(.*?)<\/sub>/gi,(_,s)=>s.replace(/[0-9]/g,d=>digits[Number(d)])).replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
}
