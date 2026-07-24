import { EntitySelectorScreen } from '@/components/EntitySelectorScreen';

export default function OpsCenter() {
  return (
    <EntitySelectorScreen
      eyebrow="Operations Center"
      headline="Which entity are you managing today?"
      subheadline="Select a workspace to open its dashboard."
    />
  );
}
