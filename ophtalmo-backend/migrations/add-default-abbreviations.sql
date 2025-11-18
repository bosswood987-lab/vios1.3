-- Migration script to add default abbreviations
-- Run this after creating the abbreviation table

-- Medical abbreviations commonly used in ophthalmology
INSERT INTO abbreviation (abbreviation, full_text, description, is_global, created_by) VALUES
('ppn', 'pôle postérieur normal', 'Description du fond d''œil', true, 'system'),
('ras', 'rien à signaler', 'Pas d''anomalie détectée', true, 'system'),
('laf', 'lampe à fente', 'Examen à la lampe à fente', true, 'system'),
('av', 'acuité visuelle', 'Mesure de l''acuité visuelle', true, 'system'),
('od', 'œil droit', 'Œil droit', true, 'system'),
('og', 'œil gauche', 'Œil gauche', true, 'system'),
('bav', 'baisse d''acuité visuelle', 'Diminution de l''acuité visuelle', true, 'system'),
('fao', 'fond d''œil', 'Examen du fond d''œil', true, 'system'),
('pio', 'pression intraoculaire', 'Mesure de la pression oculaire', true, 'system'),
('cv', 'champ visuel', 'Examen du champ visuel', true, 'system'),
('oct', 'tomographie par cohérence optique', 'Imagerie OCT', true, 'system'),
('dmla', 'dégénérescence maculaire liée à l''âge', 'DMLA', true, 'system'),
('cataracte', 'opacification du cristallin', 'Cataracte', true, 'system'),
('glaucome', 'neuropathie optique glaucomateuse', 'Glaucome', true, 'system'),
('rp', 'rétinopathie proliférante', 'Rétinopathie proliférante', true, 'system'),
('oag', 'œdème aigu du glaucome', 'Glaucome aigu', true, 'system'),
('rdp', 'rétinopathie diabétique proliférante', 'Rétinopathie diabétique proliférante', true, 'system'),
('rd', 'rétinopathie diabétique', 'Rétinopathie diabétique', true, 'system'),
('rdn', 'rétinopathie diabétique non proliférante', 'Rétinopathie diabétique non proliférante', true, 'system'),
('omb', 'œdème maculaire bilatéral', 'Œdème de la macula des deux yeux', true, 'system'),
('om', 'œdème maculaire', 'Œdème de la macula', true, 'system'),
('csme', 'clinically significant macular edema', 'Œdème maculaire cliniquement significatif', true, 'system'),
('dr', 'décollement de rétine', 'Décollement de la rétine', true, 'system'),
('dpv', 'décollement postérieur du vitré', 'DPV', true, 'system'),
('nvd', 'néovaisseaux du disque', 'Néovaisseaux sur la papille', true, 'system'),
('nve', 'néovaisseaux ailleurs', 'Néovaisseaux en périphérie', true, 'system')
ON CONFLICT DO NOTHING;
