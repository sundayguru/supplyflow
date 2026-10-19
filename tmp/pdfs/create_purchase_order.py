from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether


OUTPUT = "output/pdf/purchase-order-RFQ-2026-ED09FD.pdf"
PAGE_WIDTH, _ = A4
NAVY = colors.HexColor("#17324D")
BLUE = colors.HexColor("#246B8E")
PALE = colors.HexColor("#EEF4F7")
MID = colors.HexColor("#657687")
INK = colors.HexColor("#1D2935")
LINE = colors.HexColor("#D9E1E7")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="POBrand", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=BLUE))
styles.add(ParagraphStyle(name="POTitle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=25, leading=29, textColor=NAVY))
styles.add(ParagraphStyle(name="POLabel", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7.5, leading=10, textColor=MID, spaceAfter=3))
styles.add(ParagraphStyle(name="POValue", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=13, textColor=INK))
styles.add(ParagraphStyle(name="POValueBold", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=13, textColor=NAVY))
styles.add(ParagraphStyle(name="POBody", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=11, textColor=INK))
styles.add(ParagraphStyle(name="POBodyMuted", parent=styles["Normal"], fontName="Helvetica", fontSize=7.5, leading=10.5, textColor=MID))
styles.add(ParagraphStyle(name="TableHead", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7.2, leading=9, textColor=colors.white))
styles.add(ParagraphStyle(name="TableCell", parent=styles["Normal"], fontName="Helvetica", fontSize=7.6, leading=10, textColor=INK))
styles.add(ParagraphStyle(name="TableCellBold", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7.6, leading=10, textColor=NAVY))
styles.add(ParagraphStyle(name="Right", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=11, textColor=INK, alignment=TA_RIGHT))
styles.add(ParagraphStyle(name="RightBold", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=11, textColor=NAVY, alignment=TA_RIGHT))

P = lambda text, style="POValue": Paragraph(text, styles[style])

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(18*mm, 15*mm, PAGE_WIDTH-18*mm, 15*mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MID)
    canvas.drawString(18*mm, 10.5*mm, "PURCHASE ORDER  |  RFQ-2026-ED09FD")
    canvas.drawRightString(PAGE_WIDTH-18*mm, 10.5*mm, f"Page {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    rightMargin=18*mm, leftMargin=18*mm,
    topMargin=16*mm, bottomMargin=22*mm,
    title="Purchase Order - RFQ-2026-ED09FD",
    author="",
)
story = []

heading = Table([
    [P("SUPLOOP  /  PROCUREMENT", "POBrand"), P("PURCHASE ORDER", "POTitle")],
], colWidths=[88*mm, 88*mm])
heading.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("ALIGN", (1,0), (1,0), "RIGHT"),
    ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (-1,-1), 0),
    ("TOPPADDING", (0,0), (-1,-1), 0), ("BOTTOMPADDING", (0,0), (-1,-1), 0),
]))
story += [heading, Spacer(1, 6*mm)]

refbox = Table([
    [P("RFQ REFERENCE", "POLabel"), P("PURCHASE ORDER NO.", "POLabel"), P("ISSUE DATE", "POLabel")],
    [P("RFQ-2026-ED09FD", "POValueBold"), P("PO-2026-ED09FD", "POValue"), P("15 Oct 2026", "POValue")],
    [P("RFQ due date: 15 Nov 2026", "POBodyMuted"), P("Currency: USD", "POBodyMuted"), P("Quote valid through RFQ due date", "POBodyMuted")],
], colWidths=[68*mm, 54*mm, 54*mm])
refbox.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), PALE),
    ("BOX", (0,0), (-1,-1), 0.6, LINE),
    ("INNERGRID", (0,0), (-1,-1), 0.4, LINE),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 9), ("RIGHTPADDING", (0,0), (-1,-1), 9),
    ("TOPPADDING", (0,0), (-1,0), 8), ("BOTTOMPADDING", (0,0), (-1,0), 2),
    ("TOPPADDING", (0,1), (-1,1), 1), ("BOTTOMPADDING", (0,1), (-1,1), 2),
    ("TOPPADDING", (0,2), (-1,2), 0), ("BOTTOMPADDING", (0,2), (-1,2), 8),
]))
story += [refbox, Spacer(1, 6*mm)]

parties = Table([
    [P("SUPPLIER", "POLabel"), P("ORDERED BY / SHIP TO", "POLabel")],
    [P("Supplier name and address not stated in source RFQ.<br/>Please confirm supplier before issuing this order.", "POBody"),
     P("Peculiar Nwuguru<br/>Email: peculiar4ezeh@gmail.com<br/>Ship-to address not stated in source RFQ.", "POBody")],
], colWidths=[88*mm, 88*mm])
parties.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LINEBELOW", (0,0), (-1,0), 0.7, LINE),
    ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (-1,-1), 10),
    ("TOPPADDING", (0,0), (-1,0), 0), ("BOTTOMPADDING", (0,0), (-1,0), 5),
    ("TOPPADDING", (0,1), (-1,1), 6), ("BOTTOMPADDING", (0,1), (-1,1), 0),
]))
story += [parties, Spacer(1, 6*mm)]

story.append(P("ORDER DETAILS", "POLabel"))
rows = [[P("#", "TableHead"), P("PART NO.", "TableHead"), P("DESCRIPTION", "TableHead"), P("QTY", "TableHead"), P("UNIT PRICE", "TableHead"), P("DISC.", "TableHead"), P("SHIPPING", "TableHead"), P("LINE TOTAL", "TableHead")]]
items = [
    ("1", "PT-123", "Oliver Needle Valve, S...", "5", "$3,300.00", "2%", "$100.00", "$16,270.00"),
    ("2", "-", "Oliver Ball Valve, Sta...", "3", "$1,100.00", "-", "-", "$3,300.00"),
    ("3", "-", "Oliver Double Block &amp;...", "2", "$6,600.00", "-", "-", "$13,200.00"),
]
for row in items:
    rows.append([P(row[0], "TableCell"), P(row[1], "TableCell"), P(row[2], "TableCell"), P(row[3], "TableCell"), P(row[4], "TableCell"), P(row[5], "TableCell"), P(row[6], "TableCell"), P(row[7], "TableCellBold")])
items_table = Table(rows, colWidths=[7*mm, 18*mm, 44*mm, 10*mm, 23*mm, 16*mm, 19*mm, 25*mm], repeatRows=1)
items_table.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#F7F9FA")]),
    ("LINEBELOW", (0,0), (-1,0), 0.8, NAVY),
    ("LINEBELOW", (0,1), (-1,-1), 0.45, LINE),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("ALIGN", (3,1), (-1,-1), "RIGHT"),
    ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5),
    ("TOPPADDING", (0,0), (-1,0), 7), ("BOTTOMPADDING", (0,0), (-1,0), 7),
    ("TOPPADDING", (0,1), (-1,-1), 7), ("BOTTOMPADDING", (0,1), (-1,-1), 7),
]))
story += [items_table, Spacer(1, 4*mm)]

summary = Table([
    [P("Items subtotal", "POBody"), P("$33,000.00", "Right")],
    [P("Discount", "POBody"), P("-$330.00", "Right")],
    [P("Shipping", "POBody"), P("$100.00", "Right")],
    [P("VAT (19%)", "POBody"), P("$6,226.30", "Right")],
    [P("TOTAL ORDER VALUE", "POValueBold"), P("$38,996.30", "RightBold")],
], colWidths=[47*mm, 35*mm])
summary.setStyle(TableStyle([
    ("ALIGN", (0,0), (-1,-1), "RIGHT"),
    ("LINEABOVE", (0,4), (-1,4), 0.9, BLUE),
    ("BACKGROUND", (0,4), (-1,4), PALE),
    ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,3), 2), ("BOTTOMPADDING", (0,0), (-1,3), 2),
    ("TOPPADDING", (0,4), (-1,4), 7), ("BOTTOMPADDING", (0,4), (-1,4), 7),
]))
summary_wrap = Table([["", summary]], colWidths=[94*mm, 82*mm])
summary_wrap.setStyle(TableStyle([("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
story += [summary_wrap, Spacer(1, 5*mm)]

terms = Table([
    [P("TERMS AND CONDITIONS", "POLabel")],
    [P("The three stated line totals add to USD 32,770.00, while the RFQ states an items subtotal of USD 33,000.00 (a USD 230.00 variance). The total below follows the RFQ's stated subtotal and tax. Confirm the variance before order release.<br/>Payment terms, delivery schedule, and destination are not specified in the source RFQ. Its terms page contains only the text “sample terms.” Confirm these details with the supplier before order release.", "POBody")],
], colWidths=[176*mm])
terms.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#F7F9FA")),
    ("BOX", (0,0), (-1,-1), 0.5, LINE),
    ("LEFTPADDING", (0,0), (-1,-1), 9), ("RIGHTPADDING", (0,0), (-1,-1), 9),
    ("TOPPADDING", (0,0), (-1,0), 7), ("BOTTOMPADDING", (0,0), (-1,0), 2),
    ("TOPPADDING", (0,1), (-1,1), 1), ("BOTTOMPADDING", (0,1), (-1,1), 8),
]))
story += [KeepTogether(terms), Spacer(1, 7*mm)]

approval = Table([
    [P("AUTHORIZED BY", "POLabel"), P("DATE", "POLabel")],
    [P("________________________________________", "POBodyMuted"), P("________________________", "POBodyMuted")],
], colWidths=[116*mm, 60*mm])
approval.setStyle(TableStyle([
    ("VALIGN",(0,0),(-1,-1),"TOP"),
    ("LEFTPADDING",(0,0),(-1,-1),0), ("RIGHTPADDING",(0,0),(-1,-1),8),
    ("TOPPADDING",(0,0),(-1,-1),0), ("BOTTOMPADDING",(0,0),(-1,-1),2),
]))
story.append(approval)

doc.build(story, onFirstPage=footer, onLaterPages=footer)
