import sys, json, os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

def gerar(caminho_json, template_nome):
    # 1. Carrega os dados enviados pelo Bot (index.js)
    with open(caminho_json, 'r', encoding='utf-8') as f:
        dados = json.load(f)
    
    # 2. Define a pasta de destino baseada no tipo
    pasta = "curriculos_gerados" if template_nome == "CURRICULO" else "documentos_gerados"
    caminho_saida = os.path.join(r"F:\Bot_whatsapp", pasta, "Arquivo_Gerado.pdf")
    
    # Cria o canvas do PDF
    c = canvas.Canvas(caminho_saida, pagesize=A4)
    
    # 3. Lógica: CURRÍCULO (Layout Fixo)
    if template_nome == "CURRICULO":
        c.setFont("Helvetica-Bold", 18)
        c.drawString(50, 800, "CURRÍCULO")
        c.setFont("Helvetica", 12)
        y = 760
        for k, v in dados.items():
            c.drawString(50, y, f"{k}: {v}")
            y -= 25
            
    # 4. Lógica: DECLARAÇÕES/OFÍCIOS (Baseado em Template .txt)
    else:
        path_template = os.path.join(os.path.dirname(__file__), 'templates', f"{template_nome}.txt")
        
        if os.path.exists(path_template):
            with open(path_template, 'r', encoding='utf-8') as f:
                texto = f.read()
            
            # Substitui as tags {{CHAVE}} pelo valor que veio no JSON
            for k, v in dados.items():
                tag = f"{{{{{k.upper()}}}}}"
                texto = texto.replace(tag, v)
            
            c.setFont("Helvetica", 12)
            # Desenha o texto no PDF (quebra de linha simples)
            y = 800
            for linha in texto.split('\n'):
                c.drawString(50, y, linha)
                y -= 20
        else:
            c.drawString(50, 800, f"Erro: Template {template_nome}.txt não encontrado.")
            
    c.save()

if __name__ == "__main__":
    # sys.argv[1] é o caminho do JSON, sys.argv[2] é o nome do template
    gerar(sys.argv[1], sys.argv[2])