const xlsx = require('xlsx');

const filePath = 'c:\\Ptojeto-jaco\\NOVA PLANILHA DE SALAO 20233 - Copia.xlsm';
console.log('Lendo arquivo:', filePath);

try {
  const workbook = xlsx.readFile(filePath);
  console.log('Abas encontradas:', workbook.SheetNames);

  for (const name of workbook.SheetNames) {
      console.log(`\n============================`);
      console.log(`=== Aba: ${name}`);
      console.log(`============================`);
      const sheet = workbook.Sheets[name];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      console.log(`Total de linhas com dados: ${data.length}`);
      
      let rowsToPrint = Math.min(data.length, 3); // Apenas cabeçalhos e 1a linha
      for (let i = 0; i < rowsToPrint; i++) {
          if (data[i] && data[i].length > 0) {
             console.log(`Linha ${i}:`, JSON.stringify(data[i]));
          }
      }
  }
} catch (e) {
  console.error('Erro ao ler a planilha:', e.message);
}
