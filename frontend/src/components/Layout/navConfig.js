export const getNavSections = (role) => {
  const isAdmin = role === 'admin';
  const isEngineer = role === 'engineer';
  const isClient = role === 'client';

  const sections = [
    {
      title: 'ЗАЯВКИ',
      items: [
        {
          to: '/helpdesk/tickets',
          label: isClient ? 'Мои заявки' : isEngineer ? 'В моей работе' : 'Все заявки',
          end: false,
        },
        { to: '/helpdesk/tickets/create', label: 'Создать заявку', end: true },
      ],
    },
    {
      title: 'БАЗА ЗНАНИЙ',
      items: [
        { to: '/helpdesk/kb-articles', label: 'Все статьи', end: true },
        ...(isAdmin || isEngineer
          ? [{ to: '/helpdesk/kb-articles/create', label: 'Добавить статью', end: true }]
          : []),
      ],
    },
  ];

  if (isAdmin || isEngineer) {
    sections.push({
      title: 'СМЕНЫ',
      items: [
        {
          to: '/helpdesk/shift-management',
          label: isAdmin ? 'Управление сменами' : 'Мои смены',
          end: true,
        },
      ],
    });
  }

  if (isAdmin) {
    sections.push({
      title: 'ПОЛЬЗОВАТЕЛИ',
      items: [
        { to: '/users', label: 'Все пользователи', end: true },
        { to: '/engineers', label: 'Инженеры', end: true },
      ],
    });
    
    sections.push({
      title: 'АДМИНИСТРИРОВАНИЕ',
      items: [
        { to: '/helpdesk/categories', label: 'Категории', end: true },
        { to: '/helpdesk/priorities', label: 'Приоритеты', end: true },
        { to: '/helpdesk/classification-rules', label: 'Правила классификации', end: true },
        { to: '/helpdesk/api/metrics', label: 'Системные метрики', end: true },
        // 🔥 НОВЫЙ ПУНКТ МЕНЮ:
        { to: '/helpdesk/grafana-metrics', label: 'Дашборд Grafana', end: true },
      ],
    });
  }

  sections.push({
    title: 'АККАУНТ',
    items: [
      { to: '/helpdesk/notifications', label: 'Уведомления', end: true },
    ],
  });

  return sections;
};
