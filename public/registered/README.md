# 📸 Pasta de Fotos Autorizadas

Esta pasta contém as fotos das pessoas que possuem ingressos válidos para o jogo.

## 📋 Como Adicionar Fotos

### 1. Nome dos Arquivos

Use os seguintes nomes para as fotos:

- `ana.jpg`
- `maria.jpg`
- `joao.jpg`
- `pedro.jpg`
- `lucia.jpg`
- `carlos.jpg`
- `fernanda.jpg`
- `roberto.jpg`
- `patricia.jpg`
- `marcos.jpg`

### 2. Requisitos das Fotos

- ✅ **Formato**: JPG ou PNG
- ✅ **Qualidade**: Boa resolução (mínimo 300x300px)
- ✅ **Iluminação**: Bem iluminada
- ✅ **Rosto**: Claramente visível
- ✅ **Pessoa**: Apenas UMA pessoa por foto
- ✅ **Expressão**: Neutra (sem sorrisos exagerados)

### 3. Exemplos de Boas Fotos

- Rosto frontal
- Olhos abertos
- Sem óculos escuros
- Sem máscaras
- Fundo simples

### 4. Exemplos de Fotos Ruins

- Rosto de lado
- Olhos fechados
- Muito escuro
- Múltiplas pessoas
- Fundo muito complexo

## 🔄 Atualizando a Lista

Após adicionar novas fotos, atualize o array `registeredImages` no arquivo `app/components/FaceRecognition.tsx`:

```typescript
const registeredImages = [
  { name: "Ana Silva", src: "/registered/ana.jpg" },
  { name: "Maria Santos", src: "/registered/maria.jpg" },
  // ... adicione novas pessoas aqui
  { name: "Nova Pessoa", src: "/registered/nova_pessoa.jpg" },
];
```

## ⚠️ Importante

- As fotos são carregadas automaticamente quando a aplicação inicia
- Se uma foto não tiver rosto detectado, será ignorada
- O sistema suporta até 10 pessoas na V0
- Para mais pessoas, será necessário implementar banco de dados (V1)
