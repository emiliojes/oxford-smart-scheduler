const tests = ["6B SOC.", "5A SOC", "8B LIT", "7A ENG.", "6A SOC", "4A"];
for (const raw of tests) {
  const suffixMatch = raw.match(/\s+(LIT|ENG\.?|SPAN|SOC\.?|SCI|BIO|CHEM|PHYS|COMP|MUS|ART|PE|P\.E\.?)$/i);
  console.log(`"${raw}" -> suffix: ${JSON.stringify(suffixMatch?.[1])}`);
}
