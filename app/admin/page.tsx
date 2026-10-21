import AccessGate from "../../components/AccessGate";
import Inventory from "../../components/Inventory";
export const metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <AccessGate>
      <Inventory />
    </AccessGate>
  );
}
