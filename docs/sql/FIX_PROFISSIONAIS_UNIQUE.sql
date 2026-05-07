-- Script para corrigir a restrição única ausente na tabela profissionais.
-- Este erro ocorre ao tentar criar um funcionário (42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification).

-- 1. Remove duplicatas antes de criar a restrição, para evitar erro de violação caso haja nomes duplicados no mesmo salão.
-- (Mantém apenas o registro mais recente criado)
DELETE FROM profissionais a USING (
    SELECT MIN(ctid) as ctid, salao_id, nome
    FROM profissionais 
    GROUP BY salao_id, nome HAVING COUNT(*) > 1
) b
WHERE a.salao_id = b.salao_id 
AND a.nome = b.nome 
AND a.ctid <> b.ctid;

-- 2. Adiciona a restrição única
ALTER TABLE profissionais 
ADD CONSTRAINT profissionais_salao_id_nome_key UNIQUE (salao_id, nome);

-- 3. Caso a constraint chk_prof_nome não exista, você pode adicioná-la também, mas o problema principal era o UNIQUE.
