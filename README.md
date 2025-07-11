# 🏟️ Sistema de Reconhecimento Facial - Controle de Acesso ao Estádio

## 📋 Descrição

Sistema de reconhecimento facial desenvolvido em Next.js com face-api.js para controle de acesso ao estádio. Esta é a **V0** do projeto, que funciona com uma lista local de pessoas autorizadas (com ingressos comprados).

## 🚀 Funcionalidades

- ✅ Reconhecimento facial em tempo real via webcam
- ✅ Interface moderna e responsiva
- ✅ Verificação de acesso baseada em lista local
- ✅ Feedback visual claro (acesso liberado/negado)
- ✅ Status em tempo real dos modelos e pessoas registradas
- ✅ Tratamento de erros robusto

## 🛠️ Tecnologias Utilizadas

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **face-api.js** - Biblioteca de reconhecimento facial
- **Tailwind CSS** - Estilização
- **React Hooks** - Gerenciamento de estado

## 📁 Estrutura do Projeto

```
reconhecimento-facial/
├── app/
│   ├── components/
│   │   └── FaceRecognition.tsx    # Componente principal
│   ├── globals.css                # Estilos globais
│   ├── layout.tsx                 # Layout da aplicação
│   └── page.tsx                   # Página principal
├── public/
│   ├── models/                    # Modelos do face-api.js
│   └── registered/                # Fotos das pessoas autorizadas
├── package.json
└── README.md
```

## ⚙️ Configuração Inicial

### 1. Instalação das Dependências

```bash
npm install
```

### 2. Configuração das Fotos Autorizadas

1. Crie a pasta `public/registered/` (já criada)
2. Adicione as fotos das pessoas autorizadas na pasta:
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

**⚠️ Importante:** As fotos devem:

- Ter apenas UMA pessoa por foto
- Ter boa qualidade e iluminação
- Mostrar o rosto claramente
- Estar em formato JPG ou PNG

### 3. Verificação dos Modelos

Certifique-se de que os modelos do face-api.js estão na pasta `public/models/`:

- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`

## 🚀 Como Executar

### Desenvolvimento

```bash
npm run dev
```

Acesse: `http://localhost:3000`

### Produção

```bash
npm run build
npm start
```

## 📱 Como Usar

1. **Acesse a aplicação** no navegador
2. **Permita o acesso à webcam** quando solicitado
3. **Aguarde** os modelos carregarem (indicador verde)
4. **Verifique** se as pessoas estão registradas (indicador verde)
5. **Posicione-se** bem na frente da câmera
6. **Clique em "Verificar Acesso"**
7. **Aguarde** o resultado do reconhecimento

## 🎯 Fluxo de Funcionamento

### 1. Inicialização

- Carrega os modelos de IA do face-api.js
- Ativa a webcam do usuário
- Carrega e processa as fotos das pessoas autorizadas

### 2. Verificação

- Captura frame da webcam
- Detecta rosto na imagem
- Extrai descritor facial (128 valores numéricos)
- Compara com todos os descritores registrados
- Calcula distância euclidiana

### 3. Resultado

- **Distância < 0.45**: ✅ ACESSO LIBERADO
- **Distância ≥ 0.45**: ❌ ACESSO NEGADO

## ⚙️ Configurações Técnicas

### Threshold de Reconhecimento

- **Valor atual**: 0.45
- **Significado**: Distância máxima para considerar uma pessoa como reconhecida
- **Ajuste**: Valores menores = mais rigoroso, valores maiores = mais permissivo

### Resolução da Webcam

- **Largura**: 640px
- **Altura**: 480px
- **Facing Mode**: 'user' (câmera frontal)

### Modelos Utilizados

- **TinyFaceDetector**: Detecção de rostos
- **FaceLandmark68Net**: Pontos de referência facial
- **FaceRecognitionNet**: Descritores faciais

## 🔧 Personalização

### Adicionar Novas Pessoas

1. Adicione a foto na pasta `public/registered/`
2. Atualize o array `registeredImages` no arquivo `FaceRecognition.tsx`:

```typescript
const registeredImages = [
  // ... pessoas existentes
  { name: "Nova Pessoa", src: "/registered/nova_pessoa.jpg" },
];
```

### Alterar Threshold

No arquivo `FaceRecognition.tsx`, linha ~150:

```typescript
// Threshold para reconhecimento (0.45 é um bom valor)
if (minDist < 0.45) { // Altere este valor
```

### Personalizar Interface

O componente usa Tailwind CSS. Você pode modificar as classes CSS no JSX para personalizar a aparência.

## 🐛 Solução de Problemas

### Erro: "Nenhum rosto detectado"

- **Causa**: Rosto não está bem posicionado ou iluminado
- **Solução**: Posicione-se melhor na frente da câmera, melhore a iluminação

### Erro: "Erro ao carregar modelos"

- **Causa**: Arquivos dos modelos não encontrados
- **Solução**: Verifique se os arquivos estão na pasta `public/models/`

### Erro: "Erro ao acessar webcam"

- **Causa**: Permissões de câmera negadas
- **Solução**: Permita o acesso à câmera no navegador

### Erro: "Nenhuma imagem registrada foi carregada"

- **Causa**: Fotos não encontradas ou sem rostos detectados
- **Solução**: Verifique se as fotos estão na pasta `public/registered/` e têm rostos claros

## 📈 Próximas Versões (Roadmap)

### V1 - Banco de Dados

- [ ] Integração com banco de dados
- [ ] Sistema de cadastro de usuários
- [ ] Gerenciamento de ingressos
- [ ] Histórico de acessos

### V2 - Funcionalidades Avançadas

- [ ] Reconhecimento de múltiplas pessoas simultaneamente
- [ ] Detecção de máscaras
- [ ] Medição de temperatura
- [ ] Integração com sistemas de pagamento

### V3 - Produção

- [ ] Deploy em servidor
- [ ] SSL/HTTPS
- [ ] Logs de auditoria
- [ ] Backup automático

## 🤝 Contribuição

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👥 Autores

- Desenvolvido para projeto de controle de acesso ao estádio
- V0 - Sistema básico com lista local

---

**⚠️ Nota**: Esta é uma versão de demonstração. Para uso em produção, considere implementar medidas de segurança adicionais e integração com sistemas de banco de dados.
