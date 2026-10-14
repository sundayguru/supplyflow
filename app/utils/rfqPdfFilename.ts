export const getRfqPdfFilename = (reference: string) => {
  const name =
    reference.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-|-$/g, '') || 'rfq';
  return `${name}.pdf`;
};
