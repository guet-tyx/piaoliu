import Image from "next/image";
import { CHARACTER } from "@/data/character";
import { SectionHead } from "@/components/shared/SectionHead";
import styles from "./CharacterSection.module.css";

/**
 * 角色登场（B站式角色卡）：双列 Grid，数据来自 src/data/character.ts
 * 统计数据当前静态渲染，数字滚动动画后续统一封装
 */
export function CharacterSection() {
  return (
    <section className="section" id="char">
      <SectionHead
        tag="NEW CHARACTER"
        title="星海版首位角色登场"
        subtitle={
          <>
            她戴着你没有的耳机，坐着一艘不会沉的纸船。
            <br />
            耳机里在播什么？她也不知道——<b>漂到哪首算哪首</b>。
          </>
        }
      />

      <div className={styles.charCard}>
        <div className={styles.charPic}>
          <span className={styles.lv}>{CHARACTER.lv}</span>
          <Image
            src={CHARACTER.image}
            alt={CHARACTER.imageAlt}
            fill
            sizes="(max-width: 960px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
          />
        </div>

        <div className={styles.charInfo}>
          <div className={styles.charHead}>
            <span className={styles.charName}>
              {CHARACTER.name} <em>{CHARACTER.en}</em>
            </span>
          </div>

          <div className={styles.charTags}>
            {CHARACTER.tags.map((tag) => (
              <span
                key={tag.label}
                className={`${styles.ctag}${tag.variant ? ` ${styles[tag.variant]}` : ""}`}
              >
                {tag.label}
              </span>
            ))}
          </div>

          <p className={styles.charDesc}>
            {CHARACTER.desc.map((seg, i) =>
              seg.bold ? <b key={i}>{seg.text}</b> : <span key={i}>{seg.text}</span>,
            )}
          </p>

          <div className={styles.charStats}>
            {CHARACTER.stats.map((stat) => (
              <div className={styles.cstat} key={stat.label}>
                <b data-count={stat.value} data-suffix={stat.suffix}>
                  {stat.value}
                  {stat.suffix}
                </b>
                <small>{stat.label}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
