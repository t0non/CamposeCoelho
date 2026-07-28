import * as xlsx from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

function createTestExcel() {
  const filePath = path.join(__dirname, 'test-import.xlsx')
  
  // Create workbook
  const wb = xlsx.utils.book_new()
  
  // Data array with 3 garbage rows before header
  const data = [
    ['Lixo1', 'Random data', 'ignore me'],
    [''],
    ['Sistema Exportador', '1.0'],
    ['Código', 'Descrição', 'Cod Barras', 'Unidade', 'Preço Venda', 'Inativo'],
    ['000703', 'Produto com zeros', '1234567890123', 'UN', '15,90', 'Não'], // 000703 text
    [704, 'Produto numerico perde zero', '', 'CX', '150.00', 'Não'], // 704 number
    ['000705', 'Produto com preco zero', '', 'UN', '0,00', 'Não'],
    ['000706', 'Produto inativo', '', 'UN', '99,99', 'Sim'],
    ['000707', 'Produto sem preço', '', 'UN', '', 'Não'],
    ['000703', 'Produto duplicado (erro)', '', 'UN', '15,90', 'Não'], // Duplicated sku
  ]

  const ws = xlsx.utils.aoa_to_sheet(data)
  xlsx.utils.book_append_sheet(wb, ws, 'Planilha1')

  xlsx.writeFile(wb, filePath)
  console.log(`Planilha de teste criada em: ${filePath}`)
}

createTestExcel()
