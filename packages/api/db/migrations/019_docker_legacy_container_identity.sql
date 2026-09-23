-- Restore container identity in legacy latest snapshots when the original
-- Docker id is still present in the persisted JSON payload. Historical
-- docker_metric_samples already stores the canonical container_key.
UPDATE agent_docker_metrics
SET data = jsonb_set(
  data,
  '{containers}',
  COALESCE(
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(container) = 'object'
            AND NOT (container ? 'containerKey')
            AND jsonb_typeof(container->'id') = 'string'
            AND length(btrim(container->>'id')) > 0
          THEN container || jsonb_build_object('containerKey', container->>'id')
          ELSE container
        END
        ORDER BY ordinality
      )
      FROM jsonb_array_elements(CASE
        WHEN jsonb_typeof(data->'containers') = 'array' THEN data->'containers'
        ELSE '[]'::jsonb
      END) WITH ORDINALITY AS items(container, ordinality)
    ),
    '[]'::jsonb
  ),
  true
)
WHERE jsonb_typeof(data->'containers') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(data->'containers') AS items(container)
    WHERE jsonb_typeof(container) = 'object'
      AND NOT (container ? 'containerKey')
      AND jsonb_typeof(container->'id') = 'string'
      AND length(btrim(container->>'id')) > 0
  );
