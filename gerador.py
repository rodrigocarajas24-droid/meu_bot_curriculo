import sys
import json
import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

def gerar(caminho_json, template_nome):
    with open(caminho_json, 'r', encoding='utf-8') as f:
        dados = json.load(f)
    
    pasta = "curriculos_gerados" if template_nome == "CURRICULO" else "documentos_gerados"
    caminho_pasta = os.path.join(os.path.dirname(__file__), pasta)
    os.makedirs(caminho_pasta, exist_ok=True)
    
    nome_usuario = (
        dados.get('nome') or 
        dados.get('Qual seu nome completo?') or 
        dados.get('Nome') or 
        'Candidato'
    )
    
    nome_arquivo_limpo = "".join([c for c in nome_usuario if c.isalnum() or c.isspace()]).strip().replace(" ", "_")
    caminho_saida = os.path.join(caminho_pasta, f"Curriculo_{nome_arquivo_limpo}.pdf")
    
    if template_nome == "CURRICULO":
        doc = SimpleDocTemplate(
            caminho_saida, 
            pagesize=letter,
            rightMargin=40, leftMargin=40, 
            topMargin=40, bottomMargin=40
        )
        story = []
        styles = getSampleStyleSheet()

        COR_AZUL_FUNDO = colors.HexColor('#001F6B')
        COR_AZUL_TEXTO = colors.HexColor('#001F6B')

        estilo_nome = ParagraphStyle(
            'EstiloNome', parent=styles['Normal'],
            fontName='Helvetica-Bold', fontSize=18,
            textColor=colors.white, alignment=1, spaceAfter=4
        )
        estilo_contato = ParagraphStyle(
            'EstiloContato', parent=styles['Normal'],
            fontName='Helvetica', fontSize=9,
            textColor=colors.white, alignment=1
        )
        estilo_secao = ParagraphStyle(
            'EstiloSecao', parent=styles['Normal'],
            fontName='Helvetica-Bold', fontSize=11,
            textColor=COR_AZUL_TEXTO, spaceBefore=10, spaceAfter=2
        )
        estilo_conteudo = ParagraphStyle(
            'EstiloConteudo', parent=styles['Normal'],
            fontName='Helvetica', fontSize=10,
            textColor=colors.black, leading=13, spaceAfter=4
        )
        estilo_experiencia = ParagraphStyle(
            'EstiloExperiencia', parent=styles['Normal'],
            fontName='Helvetica', fontSize=10,
            textColor=COR_AZUL_TEXTO, leading=13, spaceAfter=2
        )

        # Captura os campos
        telefone = dados.get('telefone') or dados.get('Qual seu telefone?') or ''
        email = dados.get('email') or dados.get('Qual seu e-mail?') or ''
        cidade = dados.get('cidade') or dados.get('Qual sua cidade?') or 'Canaã dos Carajás-Pa'
        
        habilidades = dados.get('habilidades') or dados.get('Quais suas Habilidades Técnicas?') or ''
        formacao = dados.get('formacao') or dados.get('Informe sua Formação e Certificações:') or ''
        
        cnh = dados.get('cnh', '')
        viagem = dados.get('viagem', '')

        # GERAÇÃO AUTOMÁTICA DO RESUMO PROFISSIONAL DE ALTO IMPACTO
        resumo_customizado = dados.get('resumo', '')
        if not resumo_customizado or resumo_customizado.startswith('Profissional com sólida experiência'):
            if habilidades:
                habilidades_limpas = str(habilidades).replace('\n', ', ').replace(',,', ',')
                while '  ' in habilidades_limpas:
                    habilidades_limpas = habilidades_limpas.replace('  ', ' ')
                
                resumo_customizado = (
                    f"Profissional com sólida experiência e atuação técnica em automação e TI, "
                    f"especializado em {habilidades_limpas}."
                )
            else:
                resumo_customizado = "Profissional com sólida experiência e atuação técnica voltada para resultados e alta performance."

        lista_exp = dados.get('experiencias', [])
        if not lista_exp:
            exp_unica = dados.get('experiencia', '')
            if exp_unica:
                lista_exp = [exp_unica]

        # Cabeçalho Principal Azul
        texto_cabecalho = f"<b>{str(nome_usuario).upper()}</b>"
        texto_sub = f"{cidade} | Tel: {telefone} | Email: {email}"
        
        tabela_cabecalho = Table([[Paragraph(texto_cabecalho, estilo_nome)], [Paragraph(texto_sub, estilo_contato)]], colWidths=[530])
        tabela_cabecalho.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), COR_AZUL_FUNDO),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ]))
        story.append(tabela_cabecalho)
        story.append(Spacer(1, 8))

        def adicionar_secao(titulo):
            story.append(Paragraph(titulo.upper(), estilo_secao))
            t_linha = Table([['']], colWidths=[530], rowHeights=[1])
            t_linha.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), COR_AZUL_TEXTO)]))
            story.append(t_linha)
            story.append(Spacer(1, 4))

        # Seção: Resumo Profissional
        adicionar_secao("Resumo Profissional")
        story.append(Paragraph(resumo_customizado, estilo_conteudo))

        # Seção: Habilidades Técnicas
        adicionar_secao("Habilidades Técnicas")
        story.append(Paragraph(str(habilidades).replace('\n', '<br/>'), estilo_conteudo))

        # Seção: Formação e Certificações
        adicionar_secao("Formação e Certificações")
        story.append(Paragraph(str(formacao).replace('\n', '<br/>'), estilo_conteudo))

        # Seção: Informações Adicionais (Colocada antes das experiências)
        if cnh or viagem:
            adicionar_secao("Informações Adicionais")
            info_adicional = []
            if cnh:
                info_adicional.append(f"<b><font color='black'>CNH:</font></b> <font color='black'>{cnh}</font>")
            if viagem:
                info_adicional.append(f"<b><font color='black'>Disponibilidade de Viagem:</font></b> <font color='black'>{viagem}</font>")
            
            story.append(Paragraph(" | ".join(info_adicional), estilo_conteudo))
            story.append(Spacer(1, 4))

        # Seção: Experiência Profissional (Com os textos em preto normal)
        adicionar_secao("Experiência Profissional")
        for exp in lista_exp:
            partes = [p.strip() for p in str(exp).replace('\n', ',').split(',') if p.strip()]
            if len(partes) >= 4:
                story.append(Paragraph(f"<b><font color='black'>Empresa:</font></b> <font color='black'>{partes[0]}</font>", estilo_experiencia))
                story.append(Paragraph(f"<b><font color='black'>Cidade:</font></b> <font color='black'>{partes[1]}</font>", estilo_experiencia))
                story.append(Paragraph(f"<b><font color='black'>Cargo:</font></b> <font color='black'>{partes[2]}</font>", estilo_experiencia))
                story.append(Paragraph(f"<b><font color='black'>Período:</font></b> <font color='black'>{partes[3]}</font>", estilo_experiencia))
            else:
                story.append(Paragraph(f"<font color='black'>{str(exp)}</font>", estilo_experiencia))
            story.append(Spacer(1, 4))
        doc.build(story)
    else:
        c = canvas.Canvas(caminho_saida, pagesize=letter)
        path_template = os.path.join(os.path.dirname(__file__), 'templates', f"{template_nome}.txt")
        if os.path.exists(path_template):
            with open(path_template, 'r', encoding='utf-8') as f:
                texto = f.read()
            for k, v in dados.items():
                texto = texto.replace(f"{{{{{k.upper()}}}}}", str(v))
            c.setFont("Helvetica", 12)
            y = 800
            for linha in texto.split('\n'):
                c.drawString(50, y, linha)
                y -= 20
        c.save()

if __name__ == "__main__":
    gerar(sys.argv[1], sys.argv[2])