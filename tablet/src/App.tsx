import { useEffect } from 'react';
import { sectorSupportsGroupSessions } from './lib/sectorSubscriberProfile';
import { useAppStore } from './store/appStore';
import { SetupWizard } from './pages/SetupWizard';
import { Board } from './pages/Board';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { Campaigns } from './pages/Campaigns';
import { Subscribers } from './pages/Subscribers';
import { GroupClasses } from './pages/GroupClasses';
import { QrPage } from './pages/QrPage';

export default function App() {
  const hydrate = useAppStore(s => s.hydrate);
  const hydrated = useAppStore(s => s.hydrated);
  const screen = useAppStore(s => s.screen);
  const setScreen = useAppStore(s => s.setScreen);
  const company = useAppStore(s => s.company);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const sectorSlugs =
    company?.sectorSlugs?.length
      ? company.sectorSlugs
      : company?.sectorSlug
        ? [company.sectorSlug]
        : [];

  useEffect(() => {
    if (screen === 'groupClasses' && company && !sectorSupportsGroupSessions(sectorSlugs)) {
      setScreen('settings');
    }
  }, [screen, company, sectorSlugs, setScreen]);

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">
        Yükleniyor…
      </div>
    );
  }

  if (!company || screen === 'setup') return <SetupWizard />;
  if (screen === 'settings') return <Settings />;
  if (screen === 'reports') return <Reports />;
  if (screen === 'campaigns') return <Campaigns />;
  if (screen === 'subscribers') return <Subscribers />;
  if (screen === 'groupClasses' && sectorSupportsGroupSessions(sectorSlugs)) return <GroupClasses />;
  if (screen === 'qr') return <QrPage />;
  return <Board />;
}
