# 🔤 Guia: Inputs em Maiúsculas Automáticas

## Regra Global
Todos os campos de texto (nome de cliente, observações, etc) devem converter automaticamente para MAIÚSCULAS.

## Como Implementar

### 1. Adicionar classe CSS `uppercase`
```jsx
className="... uppercase"
```

### 2. Converter no onChange
```jsx
onChange={e => setForm({...form, nome: e.target.value.toUpperCase()})}
```

## Arquivos a Atualizar

### ✅ Clientes.jsx
- [x] Campo "Nome Completo" no modal

### ⏳ Agenda.jsx  
- [ ] Campo "Cliente" (se houver input direto)
- [ ] Campo "Observações"

### ⏳ Configuracoes.jsx
- [ ] Campo "Nome Completo" do profissional

### ⏳ Outros
- [ ] Despesas.jsx - campo "Descrição"
- [ ] Paralelos.jsx - campos "Cliente" e "Descrição"
- [ ] HomeCar.jsx - campos "Cliente" e "Produto"

## Exemplo Completo
```jsx
<input 
  type="text"
  value={form.nome}
  onChange={e => setForm({...form, nome: e.target.value.toUpperCase()})}
  className="w-full border p-3 rounded-lg uppercase"
/>
```

## Exceções (NÃO converter)
- ❌ Telefone
- ❌ Email
- ❌ Valores numéricos
- ❌ Senhas
