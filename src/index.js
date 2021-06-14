import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { graphql, Link, navigate } from 'gatsby';
import { MDXRenderer } from 'gatsby-plugin-mdx';

import Layout from '../../src/components/Layout';
import template from '../../src/utils/template';
import Search from './images/search.inline.svg';
import { products, oldStructure, metaData } from './config';
import DocsHome from './components/DocsHome';
import Sidebar from './components/Sidebar';
import Dropdown from '../../src/components/Dropdown';
import DocsFooter from './components/DocsFooter';
import isAesPage from './utils/isAesPage';
import getPrevNext from './utils/getPrevNext';
import Argo from './products/Argo';
import Cloud from './products/Cloud';
import EdgeStack from './products/EdgeStack';
import Telepresence from './products/Telepresence';
import Kubernetes from './products/Kubernetes';
import ContactBlock from '../../src/components/ContactBlock';
import ReadingTime from '../../src/components/ReadingTime';
import SidebarTopics from '../../src/components/SidebarTopics';
import Icon from '../../src/components/Icon';
import LearningJourneyImg from './images/learning-journe-prev-next.svg';
import './style.less';

export default ({ data, location }) => {

    const page = data.mdx || {};
    const slug = page.fields.slug.split('/');
    const isHome = page.fields.slug === '/docs/';
    const initialProduct = isHome
        ? products[0]
        : products.filter((p) => p.slug === slug[2])[0] || products[0];
    const initialVersion = isHome
        ? {}
        : initialProduct.version.filter((v) => v.id === slug[3])[0] || {};
    const isProduct = initialProduct.slug !== products[0].slug;
    const isProductHome = isProduct && !!!initialVersion.id;
    const canonicalUrl = isHome
        ? 'https://www.getambassador.io/docs/'
        : `https://www.getambassador.io/docs/${slug[2]}/latest/${slug
            .slice(4)
            .join('/')}`;
    const { title: learningTitle, description: learningDescription, readingTime: learningReadingTime, topics: learningTopics } = JSON.parse(data.allLearningjourney.nodes[0].content)[0];
    const learningPath = '?learning-journey=local-development';
    const { previous: prevLearning, next: nextLearning } = getPrevNext(learningTopics, page.fields.slug);
    const learning = new URLSearchParams(location.search).get("learning-journey");
    const isLearning = !!(learning && learning === 'local-development');

    const [product, setProduct] = useState(initialProduct);
    const [version, setVersion] = useState(initialVersion);
    const [showVersion, setShowVersion] = useState(!isHome && isProduct && !isProductHome);
    const [versionList, setVersionList] = useState(initialProduct.version);
    const [showAesPage, setShowAesPage] = useState(false);

    const isMobile = useMemo(() => {
        return typeof window !== 'undefined' ? window.innerWidth <= 800 : true
    }, []);


    useEffect(() => {
        loadJS();
        isAesPage(initialProduct.slug, slug, initialVersion.id).then(result => setShowAesPage(result))
    }, [isMobile]);

    const parseLinksByVersion = (vers, links) => {
        if (oldStructure.includes(vers)) {
            return links;
        }
        return links[1].items[0].items;
    }

    const learningParseTopics = learningTopics.map(topic => {
        const items = topic.items.map(item => {
            const readingTimeTopic = data.allMdx.edges.filter(i => i.node.fields.slug === `/docs/${item.link}`);
            return {
                ...item,
                slug: readingTimeTopic[0].node.fields.slug,
                readingTimeMinutes: Math.ceil(readingTimeTopic[0].node.fields.readingTime.minutes),
                readingTimeText: readingTimeTopic[0].node.frontmatter.reading_time_text,
                hideReadingTime: readingTimeTopic[0].node.frontmatter.hide_reading_time,
                readingTimeFront: readingTimeTopic[0].node.frontmatter.reading_time
            }
        });

        return {
            ...topic,
            items
        }
    });

    const getVersions = () => {
        if (!data.versions?.content) {
            return {};
        }
        const versions = data.versions?.content;
        return JSON.parse(versions);
    }

    const menuLinks = useMemo(() => {
        if (!data.linkentries?.content) {
            return [];
        }
        const linksJson = JSON.parse(data.linkentries?.content || []);
        return parseLinksByVersion(slug[3], linksJson);
    }, [data.linkentries, slug]);

    const getMetaData = () => {
        let metaDescription;
        let metaTitle;
        if (isHome) {
            metaTitle = metaData['home'].title;
            metaDescription = metaData['home'].description;
        } else if (isProductHome) {
            metaTitle = metaData[initialProduct.slug].title;
            metaDescription = metaData[initialProduct.slug].description;
        } else {
            metaTitle = (page.headings && page.headings[0] ? page.headings[0].value : 'Docs') + ' | Ambassador';
            metaDescription = page.frontmatter && page.frontmatter.description ? page.frontmatter.description : page.excerpt;
        }
        return { metaDescription, metaTitle };
    }

    const claenStorage = () => sessionStorage.removeItem('expandedItems');

    const handleProductChange = (e, name = null) => {
        const value = name ? name : e.target.value;
        const selectedProduct = products.filter((p) => p.slug === value)[0];
        setProduct(selectedProduct);
        setShowVersion(false);
        if (selectedProduct.slug === 'home') {
            navigate(`/docs/`);
            return;
        }
        setVersionList(selectedProduct.version);
        const newVersion = selectedProduct.version.filter(v => v.id === "latest")[0] || selectedProduct.version[0];
        setVersion(newVersion);
        navigate(selectedProduct.link);
    };

    const handleVersionChange = async (e, value = null) => {
        const newValue = value ? value : e.target.value;
        const newVersion = versionList.filter((v) => v.id === newValue)[0];
        setVersion(newVersion);
        const slugPath = slug.slice(4).join('/') || '';

        const newVersionLinks = await import(`../docs/${product.slug}/${newVersion.id}/doc-links.yml`);

        const newVersionLinksContent = parseLinksByVersion(newVersion.id, newVersionLinks.default);
        const links = [];

        function createArrayLinks(el) {
            el.forEach(i => {
                i.link && links.push(i.link.replace(/\//g, ''));
                i.items && createArrayLinks(i.items);
            });
        }

        createArrayLinks(newVersionLinksContent);

        claenStorage();

        if (links.includes(slugPath.replace(/\//g, ''))) {
            navigate(`/docs/${product.slug}/${newVersion.id}/${slugPath}`);
        } else {
            navigate(`/docs/${product.slug}/${newVersion.link}/`);
        }

    };

    const loadJS = () => {
        if (!isMobile) {
            if (window.docsearch) {
                window.docsearch({
                    apiKey: '8f887d5b28fbb0aeb4b98fd3c4350cbd',
                    indexName: 'getambassador',
                    inputSelector: '#doc-search',
                    debug: true,
                });
            } else {
                setTimeout(() => {
                    loadJS();
                }, 500);
            }
        }
    };

    const getProductHome = (product) => {
        switch (product) {
            case 'edge-stack':
                return <EdgeStack />;
            case 'telepresence':
                return <Telepresence />;
            case 'cloud':
                return <Cloud />;
            case 'argo':
                return <Argo />;
            case 'kubernetes':
                return <Kubernetes />;
            default:
                return <EdgeStack />;
        }
    }

    const footer = (
        <div>
            <hr className="docs__separator docs__container" />
            <section className="docs__contact docs__container">
                <ContactBlock />
            </section>
            {!isHome && !isProductHome && isProduct && (
                <DocsFooter page={page} product={product.slug} version={getVersions().docsVersion} />
            )}
        </div>
    );

    const sidebarContent = isLearning ?
        (
            <div className="learning-journey__sidebar docs__desktop">
                <SidebarTopics
                    title={learningTitle}
                    description={learningDescription}
                    readingTime={learningReadingTime}
                    sidebarTopicList={learningParseTopics}
                    path={learningPath}
                    glossaryView={false}
                />
            </div>
        )
        :
        <Sidebar
            onVersionChanged={handleVersionChange}
            version={version}
            versionList={versionList}
            topicList={menuLinks}
            slug={page.fields.slug}
        />;

    const content = useMemo(() => {
        if (isHome) {
            return <>
                <DocsHome />
                {footer}
            </>
        } else if (isProductHome) {
            return <>
                {getProductHome(initialProduct.slug)}
                {footer}
            </>
        }
        return (
            <div className="docs__container-doc">
                <div style={{ display: 'none' }}>{sidebarContent}</div>
                <Sidebar
                    onVersionChanged={handleVersionChange}
                    version={version}
                    versionList={versionList}
                    topicList={menuLinks}
                    slug={page.fields.slug}
                />
                <div className="docs__doc-body-container">
                    <div className="docs__doc-body doc-body">
                        <div className="doc-tags">
                            {showAesPage && (
                                <Link className="doc-tag aes" to="/editions">
                                    Ambassador Edge Stack
                                </Link>
                            )}
                        </div>
                        <ReadingTime
                            slug={page.fields.slug}
                            hideReadingTime={page.frontmatter.hide_reading_time}
                            readingTimeMinutes={page.fields.readingTime.minutes}
                            readingTimeFront={page.frontmatter.reading_time}
                            readingTimeText={page.frontmatter.reading_time_text}
                            itemClassName="docs__reading-time"
                        />
                        <MDXRenderer slug={page.fields.slug} readingTime={page.fields.readingTime.minutes}>
                            {template(page.body, getVersions())}
                        </MDXRenderer>
                        {isLearning && (
                            <div className="docs__next-previous">
                                <span className="docs__next-previous__title">Continue your learning journey</span>
                                <div className="docs__next-previous__content">
                                    <div className="docs__next-previous__previous">
                                        {prevLearning &&
                                            <>
                                                <Link to={`/docs/${prevLearning.link}${learningPath}`} className="docs__next-previous__button"><Icon name="right-arrow" /> Previous</Link>
                                                <span className="docs__next-previous__text">{prevLearning.title}</span>
                                            </>
                                        }
                                    </div>
                                    <div className="docs__next-previous__learning-journey">
                                        <img src={LearningJourneyImg} alt="Learning Journey" />
                                    </div>
                                    <div className="docs__next-previous__next">
                                        {nextLearning &&
                                            <>
                                                <Link to={`/docs/${nextLearning.link}${learningPath}`} className="docs__next-previous__button">Next <Icon name="right-arrow" /></Link>
                                                <span className="docs__next-previous__text">{nextLearning.title}</span>
                                            </>
                                        }
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {footer}
                </div>
            </div>
        );
    }, [isHome, isProductHome]);

    return (
        <Layout location={location}>
            <Helmet>
                <title>{getMetaData().metaTitle}</title>
                <meta name="og:title" content={getMetaData().metaTitle} />
                <meta name="og:type" content="article" />
                <link rel="canonical" href={canonicalUrl} />
                <meta name="description" content={getMetaData().metaDescription} />

                {!isMobile &&
                    <link
                        rel="stylesheet"
                        href="https://cdn.jsdelivr.net/docsearch.js/2/docsearch.min.css" type="text/css" media="all"
                    />}
                {!isMobile && <script defer src="https://cdn.jsdelivr.net/docsearch.js/2/docsearch.min.js"></script>}
            </Helmet>
            <div className="docs">
                <nav>
                    <div className="docs__nav">
                        <div className="docs__links-content docs__dekstop">
                            <ul className="docs__products-list">
                                {products.map((item) => (
                                    <li
                                        className={`${product.slug === item.slug ? 'docs__selected' : ''
                                            }`}
                                        key={item.name}
                                        onClick={claenStorage}
                                    >
                                        <Link to={item.link}>{item.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div
                            className={`docs__dropdown-container docs__mobile${showVersion && versionList.length > 1 ? ' docs__dropdown-version' : ''
                                }`}
                        >
                            <Dropdown
                                label={product.name}
                                handleOnChange={handleProductChange}
                                value={product.slug}
                                options={products.map((i) => ({ id: i.slug, name: i.name }))}
                            />
                            {showVersion && versionList.length > 1 && (
                                <Dropdown
                                    label={`Version: ${version.name}`}
                                    handleOnChange={handleVersionChange}
                                    value={version.id}
                                    options={versionList}
                                />
                            )}
                        </div>
                        <div className="docs__search-box">
                            <Search />
                            <input
                                name="search"
                                type="text"
                                placeholder="Search documentation"
                                id="doc-search"
                            />
                        </div>
                    </div>
                </nav>
                <div className="docs__body">
                    {content}
                </div>
            </div>
        </Layout>
    );
};

export const query = graphql`
  query($linksslug: String, $slug: String!, $learningSlugs: [String]) {
    mdx(fields: { slug: { eq: $slug } }) {
      body
      fields {
        slug
        linksslug
        readingTime {
            minutes
        }
      }
      excerpt(pruneLength: 150, truncate: true)
      headings(depth: h1) {
        value
      }
      frontmatter {
        description
        reading_time
        hide_reading_time
        reading_time_text
      }
      parent {
        ... on File {
          relativePath
        }
      }
    }
    linkentries(slug: { eq: $linksslug }) {
      id
      content
    }
    versions(slug: { eq: $linksslug }) {
      id
      content
    }
    allLearningjourney {
        nodes {
          content
          slug
        }
    }
    allMdx ( filter: { fields: { slug: { in:  $learningSlugs } } }) {
        edges {
          node {
            fields {
              slug,
              readingTime {
                minutes
              }
            }
            frontmatter {
              reading_time
              hide_reading_time
              reading_time_text
            }
          }
        }
    }
  }
`;