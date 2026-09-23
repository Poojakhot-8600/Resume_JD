import jsPDF from 'jspdf';

export function downloadCandidateReport(candidate: any, assessment: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Color Palette
  const primaryColor = [79, 70, 229]; // Indigo
  const darkColor = [17, 24, 39]; // Charcoal
  const lightColor = [243, 244, 246]; // Light gray
  const accentColor = [16, 185, 129]; // Emerald (for pass/high score)
  const textColor = [55, 65, 81]; // Gray 700

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ASSESS AI', 20, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('CANDIDATE ASSESSMENT REPORT', 20, 30);

  // Date
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.setFontSize(9);
  doc.text(`Generated: ${dateStr}`, pageWidth - 70, 30);

  // 2. Candidate Info Grid
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Candidate Profile', 20, 55);

  // Light gray block for Candidate details
  doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
  doc.roundedRect(20, 60, pageWidth - 40, 45, 2, 2, 'F');

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);

  // Column 1
  doc.text('Name:', 25, 70);
  doc.text('Email:', 25, 78);
  doc.text('Phone:', 25, 86);
  doc.text('Job Title:', 25, 94);

  doc.setFont('helvetica', 'normal');
  doc.text(candidate.name, 45, 70);
  doc.text(candidate.email, 45, 78);
  doc.text(candidate.job?.title || candidate.currentJobTitle || 'Not Assigned', 45, 94);

  // Column 2 - Overall Score Circle Card
  const score = assessment.score || 0;
  const percentage = Math.round(assessment.percentage || 0);

  // Draw Score Box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 75, 65, 50, 35, 2, 2, 'F');
  
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(`${score}`, pageWidth - 55, 84, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('/ 10 Score', pageWidth - 55, 90, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`(${percentage}%)`, pageWidth - 55, 94, { align: 'center' });

  // 3. Skills Breakdown Section
  let currentY = 120;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('Skills Match Breakdown', 20, currentY);
  currentY += 8;

  const evalData = assessment.evaluationData || {};
  const skillScores = evalData.skillScores || {};
  const skillsList = Object.entries(skillScores);

  if (skillsList.length > 0) {
    skillsList.forEach(([skill, val]: any) => {
      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(skill, 20, currentY);

      // Percentage text
      doc.setFont('helvetica', 'normal');
      doc.text(`${val}%`, pageWidth - 35, currentY);

      // Progress bar background
      doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
      doc.rect(20, currentY + 2, pageWidth - 60, 3, 'F');

      // Progress bar fill
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      const fillWidth = ((pageWidth - 60) * val) / 100;
      doc.rect(20, currentY + 2, fillWidth, 3, 'F');

      currentY += 12;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('No skill scores recorded.', 20, currentY);
    currentY += 10;
  }

  // 4. Topic Analysis
  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('Topic Analysis', 20, currentY);
  currentY += 8;

  const topicScores = evalData.topicScores || {};
  const topicList = Object.entries(topicScores);

  if (topicList.length > 0) {
    // Draw Topic table header
    doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
    doc.rect(20, currentY, pageWidth - 40, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('TOPIC', 25, currentY + 5);
    doc.text('SCORE', pageWidth - 40, currentY + 5);
    currentY += 7;

    topicList.forEach(([topic, val]: any) => {
      // Row border
      doc.setDrawColor(229, 231, 235); // Gray 200
      doc.line(20, currentY + 7, pageWidth - 20, currentY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(topic, 25, currentY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${val} / 10`, pageWidth - 40, currentY + 5);

      currentY += 7;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('No topic scores recorded.', 20, currentY);
    currentY += 10;
  }

  // Add Page break if needed, but overall feedback usually fits. Let's create a new page for Critique/Feedback
  doc.addPage();
  
  // Header on Page 2
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('ASSESS AI - EVALUATION CRITIQUE', 20, 13);

  let p2Y = 35;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('Overall AI Critique & Evaluation Summary', 20, p2Y);
  p2Y += 10;

  // Wrapped text for critique
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  const feedbackText = evalData.overallFeedback || 'No overall critique details were provided.';
  const splitText = doc.splitTextToSize(feedbackText, pageWidth - 40);
  doc.text(splitText, 20, p2Y);

  // Save the PDF
  const filename = `${candidate.name.replace(/\s+/g, '_')}_Report.pdf`;
  doc.save(filename);
}
