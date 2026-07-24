const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/opt/render/.cache/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});
const configuracaoFluxos = {
    '1': { nome: 'CURRICULO', perguntas: ['Nome', 'Telefone', 'Cidade', 'E-mail', 'Formação', 'Habilidades', 'Experiências'] },
    '2.1': { nome: 'comparecimento', perguntas: ['Nome', 'Data', 'Local'] },
    '2.7': { nome: 'residencia', perguntas: ['Nome', 'Endereço Completo'] },
    '3.1': { nome: 'oficio_padrao', perguntas: ['Nome', 'Assunto', 'Texto do Ofício'] }
};

const menuDeclarações = "📋 *Declarações disponíveis:*\n\n2.1 Comparecimento\n2.2 Conclusão de Curso\n2.3 Desemprego\n2.4 Extravio\n2.5 Isenção\n2.6 Prestação de Serviços\n2.7 Residência\n2.8 Retirada/Resp.\n2.9 Autônomo\n2.10 União Estável\n\n0️⃣ Voltar";
const menuOficios = "📩 *Ofícios:*\n\n3.1 Ofício padrão\n\n0️⃣ Voltar";

let atendimentos = {};

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Bot pronto!'));

client.on('message', async msg => {
    const chatID = msg.from;
    const cmd = msg.body.trim();
    
    let s = atendimentos[chatID] || { etapa: 'MENU' };

    const gatilhos = ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'quero fazer documento', 'documento', 'menu'];
    if (gatilhos.some(g => cmd.toLowerCase().includes(g))) {
        atendimentos[chatID] = { etapa: 'MENU' };
        return msg.reply("✨ *SISTEMA GRÁFICA DIGITAL*\n\n1️⃣ Currículos\n2️⃣ Declarações\n3️⃣ Ofícios\n0️⃣ Sair");
    }

    if (cmd === '0') {
        atendimentos[chatID] = { etapa: 'MENU' };
        return msg.reply("✨ *SISTEMA GRÁFICA DIGITAL*\n1️⃣ Currículos\n2️⃣ Declarações\n3️⃣ Ofícios");
    }

    if (s.etapa === 'MENU') {
        if (cmd === '1') {
            atendimentos[chatID] = { etapa: 'COLETA', tipo: '1', passo: 0, dados: {} };
            return msg.reply(`👤 *Currículo*: Nome Completo:`);
        } else if (cmd === '2') {
            s.etapa = 'SUBMENU_DECLARACAO';
            atendimentos[chatID] = s;
            return msg.reply(menuDeclarações);
        } else if (cmd === '3') {
            s.etapa = 'SUBMENU_OFICIO';
            atendimentos[chatID] = s;
            return msg.reply(menuOficios);
        }
    }

    if (s.etapa === 'SUBMENU_DECLARACAO' || s.etapa === 'SUBMENU_OFICIO') {
        if (configuracaoFluxos[cmd]) {
            atendimentos[chatID] = { etapa: 'COLETA', tipo: cmd, passo: 0, dados: {} };
            return msg.reply(`📝 *Iniciando ${configuracaoFluxos[cmd].nome}*\n${configuracaoFluxos[cmd].perguntas[0]}:`);
        }
    }

    if (s.etapa === 'COLETA') {
        let sAtual = atendimentos[chatID];
        const config = configuracaoFluxos[sAtual.tipo];
        sAtual.dados[config.perguntas[sAtual.passo]] = cmd;
        sAtual.passo++;

        if (sAtual.passo < config.perguntas.length) {
            msg.reply(`📱 ${config.perguntas[sAtual.passo]}:`);
            atendimentos[chatID] = sAtual;
        } else {
            sAtual.etapa = 'CONFIRMACAO';
            atendimentos[chatID] = sAtual;
            msg.reply(`✅ *Confirme os dados:*\n${JSON.stringify(sAtual.dados, null, 2)}\n\nEstão corretos? (Sim/Não)`);
        }
        return;
    }

    if (s.etapa === 'CONFIRMACAO') {
        if (cmd.toLowerCase() === 'sim') {
            const pathJson = path.join(__dirname, `dados_${chatID}.json`);
            fs.writeFileSync(pathJson, JSON.stringify(s.dados));
            const nomeTemplate = configuracaoFluxos[s.tipo].nome;

            exec(`python gerador.py "${pathJson}" "${nomeTemplate}"`, async (err) => {
                if (err) return msg.reply("❌ Erro ao gerar.");
                const pasta = (s.tipo === '1') ? 'curriculos_gerados' : 'documentos_gerados';
                const caminho = path.join(__dirname, pasta, 'Arquivo_Gerado.pdf');
                if (fs.existsSync(caminho)) {
                    await client.sendMessage(msg.from, MessageMedia.fromFilePath(caminho));
                    delete atendimentos[chatID];
                } else {
                    msg.reply("❌ Arquivo PDF não foi encontrado após a geração.");
                }
            });
        } else if (cmd.toLowerCase() === 'nao') {
            atendimentos[chatID] = { etapa: 'MENU' };
            msg.reply("❌ Processo cancelado. Escolha uma opção do menu principal:");
        }
    }
});

client.initialize();
