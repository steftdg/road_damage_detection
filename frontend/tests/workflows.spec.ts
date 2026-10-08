import { expect, test } from "@playwright/test";
import {
  imageAnalysis,
  imageId,
  mockApi,
  models,
  readyHealth,
  uploadImage,
  videoAnalysis,
} from "./fixtures";

test("une API inaccessible est annoncée et ne permet pas une fausse analyse", async ({
  page,
}) => {
  await mockApi(page, { offline: true });
  await page.goto("/");
  await expect(
    page.getByText("Service déconnecté", { exact: true }),
  ).toBeVisible();
  await uploadImage(page);
  await expect(
    page.getByRole("button", { name: "Lancer l’analyse" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Connectez le service pour lancer une analyse."),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Résultats de l’analyse" }),
  ).toHaveCount(0);
});

test("les poids absents sont expliqués tout en permettant de préparer le média", async ({
  page,
}) => {
  await mockApi(page, {
    health: { ...readyHealth, inference_ready: false, models_available: 0 },
    availableModels: models.map((model) => ({ ...model, available: false })),
  });
  await page.goto("/");
  await expect(
    page.getByText("Service connecté", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Essayer avec l’image d’exemple/ })
    .click();
  await expect(
    page.getByRole("img", { name: "Aperçu de terrain-cotonou.jpg" }),
  ).toBeVisible();
  await expect(
    page.getByText("Analyse indisponible", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lancer l’analyse" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Configurer les modèles" }).click();
  await expect(
    page.getByRole("heading", { name: "Installer les fichiers du modèle" }),
  ).toBeVisible();
  await expect(
    page.getByText("models/yolov8n_final.pt", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("À installer", { exact: true })).toHaveCount(
    models.length,
  );
});

test("un import valide affiche un aperçu et une extension invalide conserve la sélection", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  await expect(
    page.getByText("Service connecté", { exact: true }),
  ).toBeVisible();
  await uploadImage(page);
  const preview = page.getByRole("img", {
    name: "Aperçu de fixture-synthetique-route.jpg",
  });
  await expect(preview).toBeVisible();
  await expect
    .poll(() =>
      preview.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: "Lancer l’analyse" }),
  ).toBeEnabled();
  await page
    .getByLabel("Choisir une image ou une vidéo")
    .setInputFiles({
      name: "document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF test"),
    });
  await expect(page.getByRole("alert")).toContainText(
    "Format non pris en charge.",
  );
  await expect(preview).toBeVisible();
  await page
    .getByRole("button", { name: "Fermer le message d’erreur" })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Retirer le fichier de la sélection" })
    .click();
  await expect(
    page.getByRole("button", { name: "Lancer l’analyse" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Parcourir les fichiers" }),
  ).toBeVisible();
});

test("réglages clavier, progression, zones et exports forment un parcours complet", async ({
  page,
}, testInfo) => {
  const api = await mockApi(page);
  await page.goto("/");
  await expect(
    page.getByText("Service connecté", { exact: true }),
  ).toBeVisible();
  await uploadImage(page);
  const settings = page.getByRole("button", { name: "Affiner l’analyse" });
  await settings.click();
  await expect(settings).toHaveAttribute("aria-expanded", "true");
  const slider = page.getByRole("slider", { name: /Seuil de confiance/ });
  await slider.focus();
  await slider.press("Home");
  for (let step = 0; step < 10; step += 1) await slider.press("ArrowRight");
  await expect(slider).toHaveValue("0.55");
  await expect(page.locator("output")).toHaveText("55 %");
  await page.getByRole("button", { name: "Lancer l’analyse" }).click();
  const progress = page
    .getByRole("status")
    .filter({ has: page.getByRole("progressbar") });
  await expect(progress).toContainText("En attente");
  await expect(
    page.getByLabel("Choisir une image ou une vidéo"),
  ).toBeDisabled();
  await expect(page.getByLabel("Modèle de détection")).toBeDisabled();
  await expect(progress).toContainText("Détection des dommages");
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "48");
  const results = page.getByRole("region", { name: "Résultats de l’analyse" });
  await expect(
    results.getByRole("heading", { name: "3 détections" }),
  ).toBeVisible();
  await expect(page.locator(".detection-box")).toHaveCount(3);
  await expect(results.locator(".detection-row")).toHaveCount(3);
  expect(api.multipart()).toContain('name="model_id"\r\n\r\nfinal');
  expect(api.multipart()).toContain('name="confidence"\r\n\r\n0.55');
  expect(api.multipart()).toContain('filename="fixture-synthetique-route.jpg"');

  const pothole = results.getByRole("button", { name: /Nid-de-poule.*84 %/ });
  await pothole.click();
  await expect(pothole).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Nid-de-poule, confiance 84 %" }),
  ).toHaveClass(/highlighted/);
  await results.getByRole("button", { name: "Fissures", exact: true }).click();
  await expect(results.locator(".detection-row")).toHaveCount(2);
  await results.getByRole("button", { name: "Toutes les zones" }).click();
  await expect(results.locator(".detection-row")).toHaveCount(3);
  await expect(
    results.getByRole("link", { name: "CSV", exact: true }),
  ).toHaveAttribute("href", `/api/analyses/${imageId}/export?format=csv`);
  await expect(
    results.getByRole("link", { name: "JSON", exact: true }),
  ).toHaveAttribute("href", `/api/analyses/${imageId}/export?format=json`);
  await expect(
    page.getByRole("link", { name: "Média annoté" }),
  ).toHaveAttribute("href", imageAnalysis.annotated_url!);
  await page.getByRole("button", { name: "Original", exact: true }).click();
  await expect(page.locator(".detection-box")).toHaveCount(0);
  await page.getByRole("button", { name: /^Détections/ }).click();
  await expect(page.locator(".detection-box")).toHaveCount(3);
  await page.screenshot({
    path: testInfo.outputPath("desktop-results.png"),
    fullPage: true,
  });
});

test("une erreur serveur garde le fichier et donne un message exploitable", async ({
  page,
}) => {
  await mockApi(page, {
    createError: "Le fichier est illisible. Choisissez une autre image.",
  });
  await page.goto("/");
  await expect(
    page.getByText("Service connecté", { exact: true }),
  ).toBeVisible();
  await uploadImage(page);
  await page.getByRole("button", { name: "Lancer l’analyse" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Le fichier est illisible. Choisissez une autre image.",
  );
  await expect(
    page.getByRole("img", { name: "Aperçu de fixture-synthetique-route.jpg" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lancer l’analyse" }),
  ).toBeEnabled();
});

test("rouvrir une analyse charge les détections détaillées absentes de la liste", async ({
  page,
}) => {
  const api = await mockApi(page, { history: [imageAnalysis, videoAnalysis] });
  await page.goto("/#historique");
  await expect(
    page.getByRole("button", {
      name: "Ouvrir fixture-synthetique-cotonou.jpg",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ouvrir fixture-synthetique-cotonou.jpg" })
    .click();
  await expect(page).toHaveURL(/#analyse$/);
  await expect(
    page.getByRole("heading", { name: "3 détections" }),
  ).toBeVisible();
  await expect(page.locator(".detection-row")).toHaveCount(3);
  await expect(page.locator(".detection-box")).toHaveCount(3);
  expect(api.detailRequests()).toBe(1);
  await expect(
    page.getByRole("img", {
      name: "Image originale : fixture-synthetique-cotonou.jpg",
    }),
  ).toBeVisible();
});

test("historique : recherche sans distinction de casse, filtres et remise à zéro", async ({
  page,
}) => {
  await mockApi(page, { history: [imageAnalysis, videoAnalysis] });
  await page.goto("/#historique");
  const search = page.getByRole("searchbox", {
    name: "Rechercher dans l’historique",
  });
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await search.fill("COTONOU");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("button", {
      name: "Ouvrir fixture-synthetique-cotonou.jpg",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Vidéos", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Aucun fichier trouvé" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Réinitialiser la recherche" })
    .click();
  await expect(search).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Tout", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Vidéos", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Ouvrir fixture-synthetique-video.mp4" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Images", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Ouvrir fixture-synthetique-cotonou.jpg",
    }),
  ).toBeVisible();
});

test("le raccourci de contenu et la navigation fonctionnent au clavier", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Aller au contenu" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  const history = page.getByRole("link", { name: "Historique", exact: true });
  await history.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#historique$/);
  await expect(history).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Aucune analyse enregistrée" }),
  ).toBeVisible();
  await page.reload();
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page).toHaveURL(/#historique$/);
});

test("à 390 px les pages et les résultats restent dans la largeur de l’écran", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page, { history: [imageAnalysis, videoAnalysis] });
  await page.goto("/");
  await expect(
    page.getByText("Service connecté", { exact: true }),
  ).toBeVisible();
  const assertNoPageOverflow = async () => {
    const measurements = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      containers: [
        ".app-shell",
        ".main-shell",
        ".main-content",
        ".history-table-wrap",
        ".history-table",
        ".history-controls",
        ".skip-link",
      ].map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return { selector, present: false };
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          selector,
          width: box.width,
          right: box.right,
          minWidth: style.minWidth,
          overflowX: style.overflowX,
        };
      }),
      hiddenLabels: Array.from(document.querySelectorAll(".sr-only")).map(
        (element) => ({
          text: element.textContent?.slice(0, 60),
          right: element.getBoundingClientRect().right,
          containingBlock: (element as HTMLElement).offsetParent?.className,
        }),
      ),
    }));
    expect(
      measurements.content,
      JSON.stringify(measurements),
    ).toBeLessThanOrEqual(measurements.viewport + 1);
  };
  await assertNoPageOverflow();
  await expect(
    page.getByRole("button", { name: "Parcourir les fichiers" }),
  ).toBeInViewport();
  await page.screenshot({
    path: testInfo.outputPath("mobile-empty.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: /^Historique/ }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await assertNoPageOverflow();
  await page
    .getByRole("button", { name: "Ouvrir fixture-synthetique-cotonou.jpg" })
    .click();
  await expect(page.locator(".detection-row")).toHaveCount(3);
  await assertNoPageOverflow();
  await page.screenshot({
    path: testInfo.outputPath("mobile-results.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Modèles", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Installer les fichiers du modèle" }),
  ).toBeVisible();
  await assertNoPageOverflow();
  await page.getByRole("link", { name: "Guide", exact: true }).click();
  await expect(page).toHaveURL(/#guide$/);
  await assertNoPageOverflow();
});

test("le sélecteur personnalisé reste utilisable au clavier", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  const choice = page.getByRole("combobox", { name: "Modèle de détection" });
  await choice.focus();
  await choice.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await choice.press("End");
  await choice.press("Enter");
  await expect(choice).toContainText("Haute résolution");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await choice.press("Enter");
  await choice.press("Escape");
  await expect(choice).toBeFocused();
  await expect(choice).toHaveAttribute("aria-expanded", "false");
});

test("la solution ne présente plus de contexte universitaire et la navigation mobile reste en bas", async ({
  page,
}) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const navigation = page.getByRole("navigation", {
    name: "Navigation mobile",
  });
  await expect(navigation).toBeInViewport();
  await expect(page.locator("body")).not.toContainText(
    /IFRI|Trésor Steffi|Licence|Une meilleure lecture|Atelier d’inspection/,
  );
  await page.getByRole("link", { name: "Guide", exact: true }).click();
  await expect(page.locator("header h1")).toHaveText("Guide");
  await expect(page.locator(".guide-steps li")).toHaveCount(4);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(navigation).toBeInViewport();
});
