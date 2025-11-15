import { toast } from "sonner";

// Fonction pour charger html2pdf.js dynamiquement
const loadHtml2Pdf = () => {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) {
      resolve(window.html2pdf);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => resolve(window.html2pdf);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Fonction principale pour générer PDF et ouvrir email
export const genererPdfEtOuvrirEmail = async (htmlContent, emailDestinataire, sujet, nomFichier, messagePersonnalise) => {
  try {
    toast.info("Génération du PDF en cours...");
    
    // Charger html2pdf.js
    const html2pdf = await loadHtml2Pdf();

    // Ouvrir une fenêtre popup avec le contenu
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Attendre que les images se chargent
    await new Promise(resolve => {
      if (printWindow.document.readyState === 'complete') {
        resolve();
      } else {
        printWindow.addEventListener('load', resolve);
      }
    });

    // Petit délai supplémentaire pour s'assurer que tout est chargé
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Générer et télécharger le PDF depuis la fenêtre popup
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${nomFichier}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        logging: false,
        allowTaint: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      }
    };

    await html2pdf()
      .set(opt)
      .from(printWindow.document.body)
      .save();

    // Fermer la fenêtre popup
    printWindow.close();

    toast.success("PDF téléchargé ! Attachez-le à l'email qui s'ouvre.");

    // Ouvrir l'application mail locale avec mailto
    const corpsEmail = messagePersonnalise + "\n\n(Veuillez attacher le PDF téléchargé)";
    const mailtoLink = `mailto:${emailDestinataire}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corpsEmail)}`;
    
    window.location.href = mailtoLink;

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    toast.error("Erreur lors de la génération du PDF");
    throw error;
  }
};