import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidade — SiteLink',
};

export default function PrivacidadePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Política de privacidade</h1>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        O SiteLink é um projeto de TCC (trabalho de conclusão de curso) em desenvolvimento. Este
        texto resume, de forma simples, como os dados são tratados enquanto o produto está em
        construção.
      </p>

      <h2 className="text-lg font-medium">Quais dados coletamos</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Nome e e-mail informados no cadastro; os dados públicos da empresa que você indicar
        (Instagram, Google ou preenchimento manual), usados apenas para montar o seu site; e
        métricas de uso do próprio SiteLink (como visitas ao site gerado e cliques no WhatsApp), sem
        dados pessoais de quem visita.
      </p>

      <h2 className="text-lg font-medium">Para que usamos</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Para gerar e publicar o site da sua empresa, para pesquisa acadêmica sobre o uso do sistema
        (sem identificar você nos resultados publicados) e para você acompanhar o desempenho do site
        publicado.
      </p>

      <h2 className="text-lg font-medium">Seus direitos</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Você pode pedir a exclusão da sua conta e dos seus dados a qualquer momento. Essa opção
        estará disponível diretamente no painel em uma fase futura do projeto; até lá, o pedido pode
        ser feito diretamente a quem administra o SiteLink.
      </p>

      <h2 className="text-lg font-medium">Titularidade da empresa</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Ao publicar um site, você declara ser o dono ou responsável pelo negócio informado. O
        SiteLink não verifica essa titularidade de forma independente.
      </p>
    </main>
  );
}
