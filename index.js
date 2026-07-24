const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

const isWindows = os.platform() === 'win32';
const chromePath = isWindows 
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
    : '/usr/bin/google-chrome-stable';

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
    puppeteer: {
        executablePath: chromePath,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--single-process', // Roda em processo único para economizar RAM
            '--disable-extensions',
            '--memory-pressure-off',
            '--max_old_space_size=256'
        ]
    }
});

let atendimentos = {};

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Bot pronto e conectado!'));

client.on('message', async msg => {
    const chatID = msg.from;
    const cmd = msg.body.trim();
    
    let s = atendimentos[chatID] || { etapa: 'MENU' };

    const gatilhos = ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'quero fazer documento', 'documento', 'menu'];
    if (gatilhos.some(g => cmd.toLowerCase().includes(g))) {
        atendimentos[chatID] = { etapa: 'MENU' };
        return msg.reply("✨ *SISTEMA GRÁFICA DIGITAL*\n\n1️⃣ Currículos ATS\n2️⃣ Declarações\n3️⃣ Ofícios\n0️⃣ Sair");
    }

    if (cmd === '0' && s.etapa === 'MENU') {
        return msg.reply("Sessão encerrada. Envie 'Oi' quando quiser iniciar novamente.");
    }

    if (s.etapa === 'MENU') {
        if (cmd === '1') {
            atendimentos[chatID] = { 
                etapa: 'CURRICULO_FLUXO', 
                passo: 0, 
                dados: { experiencias: [] },
                qtdExp: 0,
                expAtual: 0
            };
            return msg.reply("✨ Bom dia! É um prazer ajudar você a dar o próximo passo na sua carreira. Estou aqui para transformar suas experiências em um currículo de alto impacto, otimizado para sistemas de seleção (ATS). Vamos começar?\n\n👤 Para iniciarmos, qual é o seu nome completo?");
        }
    }

    if (s.etapa === 'CURRICULO_FLUXO') {
    let st = atendimentos[chatID];

    // Passo 0: Nome
    if (st.passo === 0) {
        st.dados['nome'] = cmd.trim();
        st.passo = 1;
        return msg.reply("📱 Qual seu telefone?");
    }
    // Passo 1: Telefone
    else if (st.passo === 1) {
        st.dados['telefone'] = cmd.trim();
        st.passo = 2;
        return msg.reply("📍 Qual sua cidade?");
    }
    // Passo 2: Cidade
    else if (st.passo === 2) {
        st.dados['cidade'] = cmd.trim();
        st.passo = 3;
        return msg.reply("📧 Qual seu e-mail?");
    }
    // Passo 3: Email
    else if (st.passo === 3) {
        st.dados['email'] = cmd.trim();
        st.passo = 4;
        return msg.reply("💼 Quantas experiências profissionais deseja cadastrar?\n*(Digite apenas o número, ex: 1, 2, 3...)*");
    }
    // Passo 4: Quantidade de experiências
    else if (st.passo === 4) {
        let qtd = parseInt(cmd);
        if (isNaN(qtd) || qtd <= 0) {
            return msg.reply("Por favor, informe um número válido de experiências (ex: 1, 2, 3...).");
        }
        st.qtdExp = qtd;
        st.expAtual = 1;
        st.dados.experiencias = []; // Inicializa o array de experiências com segurança
        st.passo = 5; 
        return msg.reply(`📝 Cadastre a exp ${st.expAtual} separando por vírgula:\nEmpresa, Cidade, Cargo, Período\n\n*(Ex: TecWise, Canaã dos Carajás-Pa, Técnico de Automação, 05/02/2025 a 02/02/2026)*`);
    }
    // Passo 5: Loop de cadastro de cada experiência
    else if (st.passo === 5) {
        let textoExp = cmd.trim();
        st.dados.experiencias.push(textoExp);

        if (st.expAtual < st.qtdExp) {
            st.expAtual++;
            return msg.reply(`📝 Cadastre a exp ${st.expAtual} separando por vírgula:\nEmpresa, Cidade, Cargo, Período`);
        } else {
            st.passo = 6; // Terminou as experiências, vai para formação
            return msg.reply("🎓 Informe sua Formação e Certificações:");
        }
    }
    // Passo 6: Habilidades Técnicas
    else if (st.passo === 6) {
        st.dados['formacao'] = cmd.trim();
        st.passo = 7;
        return msg.reply(
            "🛠️ *Quais suas Habilidades Técnicas?*\n\n" +
            "💡 _Dica: Digite suas competências, ferramentas, softwares ou conhecimentos da sua área (ex: Excel, Power BI, Python, Manutenção, etc.), um abaixo do outro ou separados por vírgula._"
        );
    }
    // Passo 7: CNH
    else if (st.passo === 7) {
        st.dados['habilidades'] = cmd.trim();
        st.passo = 8;
        return msg.reply(
            "🚗 *Possui CNH e qual categoria?*\n\n" +
            "💡 _Informe sua CNH para destacar esse diferencial para o recrutador._\n" +
            "*(Ex: AD, B ou Não)*"
        );
    }
    // Passo 8: disponibilidade de viagem
    else if (st.passo === 8) {
        st.dados['cnh'] = cmd.trim();
        st.passo = 9;
        return msg.reply("✈️ Tem disponibilidade de viagem?\n*(Ex: Sim, total / Apenas finais de semana / Não)*");
    }
    // Passo 9: Disponibilidade de viagem -> Vai para a Revisão com Taxa PIX
    else if (st.passo === 9) {
        st.dados['viagem'] = cmd.trim();
        st.passo = 10;
        st.etapa = 'REVISAO_PIX';

        let expFormatada = st.dados.experiencias.join('\n');

        let resumo = `📋 *Revise seus dados antes de gerar:*\n\n` +
                     `👤 *Nome:* ${st.dados.nome}\n` +
                     `📱 *Tel:* ${st.dados.telefone}\n` +
                     `📍 *Cidade:* ${st.dados.cidade}\n` +
                     `📧 *Email:* ${st.dados.email}\n` +
                     `💼 *Cargos/Experiências:*\n${expFormatada}\n` +
                     `🎓 *Formação:* ${st.dados.formacao}\n` +
                     `🛠️ *Habilidades:* ${st.dados.habilidades}\n` +
                     `🚗 *CNH:* ${st.dados.cnh}\n` +
                     `✈️ *Viagem:* ${st.dados.viagem}\n\n` +
                     `-----------------------------------\n` +
                     `💡 *Por que cobramos uma taxa?*\n` +
                     `Para manter nosso serviço online 24/7, realizar a manutenção constante do sistema de formatação ATS (que garante que seu currículo seja lido pelos robôs das empresas) e oferecer suporte personalizado.\n\n` +
                     `Deseja corrigir algo ou prosseguir?\n` +
                     `1️⃣ Editar dados (Reinicia o cadastro)\n` +
                     `2️⃣ Pagar taxa (R$ 10,00 via PIX)`;
        
        return msg.reply(resumo);
    }
}
    if (s.etapa === 'REVISAO_PIX') {
        if (cmd === '1') {
            atendimentos[chatID] = { etapa: 'MENU' };
            return msg.reply("🔄 Cadastro reiniciado. Envie 'Oi' para começar novamente.");
        } else if (cmd === '2') {
            msg.reply("⏳ Pagamento confirmado! Gerando seu currículo otimizado para ATS, aguarde um instante...");

            const pathJson = path.join(__dirname, `dados_${chatID}.json`);
            fs.writeFileSync(pathJson, JSON.stringify(s.dados));

            exec(`python gerador.py "${pathJson}" "CURRICULO"`, async (err) => {
                if (err) {
                    console.error(err);
                    return msg.reply("❌ Erro ao gerar o arquivo PDF.");
                }
                
                // Pasta onde o gerador Python salva os currículos
                const pastaDestino = path.join(__dirname, 'curriculos_gerados');
                
                if (fs.existsSync(pastaDestino)) {
                    // Pega automaticamente o arquivo PDF mais recente gerado na pasta
                    const arquivos = fs.readdirSync(pastaDestino)
                        .filter(f => f.endsWith('.pdf'))
                        .map(f => ({
                            nome: f,
                            tempo: fs.statSync(path.join(pastaDestino, f)).mtime.getTime()
                        }))
                        .sort((a, b) => b.tempo - a.tempo);

                    if (arquivos.length > 0) {
                        const caminhoMaisRecente = path.join(pastaDestino, arquivos[0].nome);
                        await client.sendMessage(msg.from, MessageMedia.fromFilePath(caminhoMaisRecente));
                        delete atendimentos[chatID];
                    } else {
                        msg.reply("❌ Nenhum arquivo PDF encontrado na pasta.");
                    }
                } else {
                    msg.reply("❌ A pasta de currículos gerados não foi encontrada.");
                }
            });
        } else {
            return msg.reply("Opção inválida. Digite:\n1️⃣ Para Editar dados\n2️⃣ Para Pagar taxa (R$ 10,00 via PIX)");
        }
    }
});

client.initialize();

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot do WhatsApp com fluxo ATS e PIX rodando perfeitamente!\n');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor HTTP rodando na porta ${PORT}`);
});
